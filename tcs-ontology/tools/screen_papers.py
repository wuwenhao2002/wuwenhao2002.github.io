#!/usr/bin/env python3
"""Review gate for title-inferred bibliographic candidates.

Never silently converts title evidence into expert/excerpt review. Existing accepted
records stay unchanged, while new proposals are filtered by explicit disambiguation
and the saved exclusion registry. Rejected candidates remain auditable.
"""
from __future__ import annotations
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
EXCLUDE_DOMAIN=re.compile(
  r"protein|ligand|drug|climate|vehicle|robotic|3d multi.object|student dropout|"
  r"crime hotspot|higgs.boson|molecular property|human mobility|species distribution|"
  r"pangenome|credit risk|matching prompts|matching expert range|map.matching|"
  r"flow matching|matching polynomial|benzenoid|hexacyclic|attitude control|"
  r"vision localization|phenylene|feature.matching|destination matching",
  re.I,
)
REJECT_HOMONYM=re.compile(
  r"flow.matching|map.matching|pattern.matching|matching.polynomial|"
  r"matching.prompt|matching.related.objects|matching.the.method|matching.expert.range",
  re.I,
)
PREDICTION_CONTEXT=re.compile(r"\b(predictions?|advice|learning.augmented)\b",re.I)
def normalize(value:str)->str:
    return re.sub(r"\s+"," ",re.sub(r"[^\w]+"," ",value.casefold())).strip()
def screen(paper:dict,excluded_ids:set[str])->tuple[dict|None,str|None]:
    title=paper.get("title","")
    if paper.get("id") in excluded_ids:return None,"previously rejected by editorial exclusion registry"
    if EXCLUDE_DOMAIN.search(title):return None,"out-of-domain or matching homonym in title"
    filtered=[]
    for ref in paper.get("primitives",[]):
        id=ref.get("primitive_id","")
        if id in ("property.prediction-robustness","property.prediction-consistency","property.prediction-error"):
            if not PREDICTION_CONTEXT.search(title):continue
        if id=="problem.graph-matching" and REJECT_HOMONYM.search(title):continue
        if id=="lens.algorithmic-sensitivity" and re.search(
            r"(residual|global) sensitivity.*(private|privacy)|sensitivity analysis of.*price of anarchy",title,re.I
        ):continue
        if id=="property.recourse-bound" and re.search(r"integer recourse|actionable recourse",title,re.I):continue
        if ref.get("evidence")!="title_exact_phrase":continue
        filtered.append(ref)
    if len(filtered)<2:return None,"fewer than two unambiguous title-derived primitives"
    record={**paper,"primitives":filtered,
      "review_status":"title_inferred_unverified",
      "curation_note":"Title-only labels passed automated homonym checks; no full-text semantic review."}
    return record,None
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input",type=Path,default=DATA/"papers-proposed.json")
    ap.add_argument("--accepted",type=Path,default=DATA/"papers-harvested.json")
    ap.add_argument("--rejected",type=Path,default=DATA/"papers-rejected.json")
    ap.add_argument("--no-preserve",action="store_true",help="Do not merge previously accepted records")
    args=ap.parse_args()
    raw=json.loads(args.input.read_text(encoding="utf8"))
    if not isinstance(raw.get("items"),list):raise SystemExit("missing input items")
    rejection=json.loads(args.rejected.read_text(encoding="utf8")) if args.rejected.exists() else {"items":[]}
    denied={p["id"] for p in rejection["items"]}
    current=json.loads(args.accepted.read_text(encoding="utf8")) if args.accepted.exists() else {"items":[]}
    accepted={} if args.no_preserve else {normalize(x["title"]):x for x in current["items"]}
    removed={}
    for candidate in raw["items"]:
        key=normalize(candidate.get("title",""))
        if not key or key in accepted:continue
        item,reason=screen(candidate,denied)
        if item is not None:accepted[key]=item
        else:removed[candidate["id"]]={"id":candidate["id"],"title":candidate.get("title",""),"reason":reason}
    if not accepted:raise SystemExit("No accepted titles; refusing to replace curated corpus")
    result={**current,"schema_version":"0.4.1",
      "source":"Crossref/DBLP bibliographic metadata with title-only inferred labels",
      "warning":"Automated labels are unverified and may have false positives. Missing links do not imply absence of research.",
      "items":sorted(accepted.values(),key=lambda p:(-p["year"],p["title"]))}
    rejected={p["id"]:p for p in rejection["items"]}
    rejected.update(removed)
    args.accepted.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    args.rejected.write_text(json.dumps({"schema_version":"0.4.1",
      "description":"Excluded or ambiguous candidate records with reasons, retained for audit.",
      "items":list(rejected.values())},ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("accepted:",len(result["items"]),"newly rejected:",len(removed),flush=True)
if __name__=="__main__":
    main()
