#!/usr/bin/env python3
"""Fetch public DBLP bibliographic metadata and propose *title-only* primitive labels.

Strictly separates curated/verified paper relations from title-inferred candidate
relations. DBLP metadata is CC0 (https://dblp.org/faq/13501473.html).
No DOI/arXiv full text is downloaded; this does not verify a paper's contents.

Usage:
    python3 tools/harvest_papers.py --output data/papers-harvested.json
    python3 tools/harvest_papers.py --dry-run
    python3 tools/harvest_papers.py --limit 3000
"""
from __future__ import annotations
import argparse
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
USER_AGENT="TCSOntology/0.4 (public academic metadata; github.com/wuwenhao2002/wuwenhao2002.github.io)"
PROFILES={
    "Michael Dinitz":"27/2346",
    "Yuichi Yoshida":"36/4449",
    "Sepehr Assadi":"125/2903",
    "Tim Roughgarden":"r/TimRoughgarden",
    "Avrim Blum":"b/AvrimBlum",
}
QUERIES=[
    "algorithms with predictions","learning augmented algorithms","distributional predictions",
    "robustness consistency online algorithms","online matching prediction",
    "differentially private graph","private graph cuts","private matching",
    "differential privacy approximation algorithms","differential privacy submodular",
    "algorithmic sensitivity","average sensitivity algorithms","low sensitivity matching",
    "Lipschitz continuous algorithms","stable approximation algorithms",
    "fault tolerant graph spanner","fault tolerant shortest paths",
    "online algorithms recourse","dynamic graph algorithms",
    "price of anarchy congestion games","price of anarchy auction",
    "online bipartite matching","streaming graph algorithms",
    "distributed maximal independent set","property testing graphs",
    "approximation algorithm submodular maximization",
    "replicable learning","replicable bandits",
    "prophet inequality predictions","secretary problem predictions",
    "sensitivity private voting","fair allocation EFX",
]
# Each matched term must be explicitly present in the TITLE; no inference
# from an author's background, venue, citations, or unrelated paper terms.
PATTERNS={
 "lens.prediction":[r"\bpredictions?\b",r"\blearning.augmented\b",r"\bprediction.augmented\b"],
 "model.distributional-prediction":[r"\bdistributional predictions?\b"],
 "model.prediction-portfolio":[r"\bprediction portfolios?\b"],
 "property.prediction-robustness":[r"\brobustness\b",r"\brobust\b"],
 "property.prediction-consistency":[r"\bconsistency\b",r"\bconsistent\b"],
 "property.prediction-error":[r"\bprediction error\b"],
 "lens.differential-privacy":[r"\bdifferential(?:ly)? private\b",r"\bdifferential privacy\b"],
 "model.edge-differential-privacy":[r"\bedge.differential(?:ly)? private\b",r"\bedge privacy\b"],
 "model.node-differential-privacy":[r"\bnode.differential(?:ly)? private\b",r"\bnode privacy\b"],
 "lens.algorithmic-sensitivity":[r"\b(?:average|low|worst.case|global|pointwise) sensitivity\b",r"\bsensitivity (?:of|lower bounds|in|for)\b"],
 "property.average-algorithmic-sensitivity":[r"\baverage sensitivity\b"],
 "property.pointwise-lipschitz-continuity":[r"\bpointwise lipschitz\b"],
 "property.lipschitz-constant":[r"\blipschitz constants?\b"],
 "property.solution-stability":[r"\bstable (?:solutions?|algorithms?)\b"],
 "property.recourse-bound":[r"\brecourse\b"],
 "lens.fault-tolerance":[r"\bfault.toleran(?:t|ce)\b"],
 "lens.replicability":[r"\breplicab(?:le|ility)\b"],
 "problem.ski-rental":[r"\bski rental\b"],
 "problem.binary-search":[r"\bbinary search\b"],
 "problem.tree-search":[r"\btree search\b"],
 "problem.joint-replenishment-with-deadlines":[r"\bjoint replenishment\b"],
 "problem.minimum-k-cut":[r"\bminimum k.cut\b",r"\bmin k.cut\b"],
 "problem.multiway-cut":[r"\bmultiway cut\b"],
 "problem.densest-subgraph":[r"\bdensest subgraph\b"],
 "problem.maximum-cut":[r"\bmax(?:imum)? cut\b"],
 "problem.minimum-cut":[r"\bmin(?:imum)? cut\b"],
 "problem.maximum-matching":[r"\bmaximum matching\b"],
 "problem.graph-matching":[r"\bmatching\b"],
 "problem.maximal-matching":[r"\bmaximal matching\b"],
 "problem.all-pairs-shortest-paths":[r"\ball.pairs (?:shortest )?(?:paths?|distances?)\b"],
 "problem.shortest-path":[r"\bshortest paths?\b"],
 "problem.steiner-tree":[r"\bsteiner tree\b"],
 "problem.graph-coloring":[r"\bgraph coloring\b",r"\bvertex coloring\b"],
 "problem.minimum-vertex-cover":[r"\bvertex cover\b"],
 "problem.maximum-independent-set":[r"\bmaximum independent set\b"],
 "problem.distributed-maximal-independent-set":[r"\bmaximal independent set\b"],
 "problem.online-bipartite-matching":[r"\bonline bipartite matching\b"],
 "problem.online-set-cover":[r"\bonline set cover\b"],
 "problem.set-cover":[r"\bset cover\b"],
 "problem.maximum-coverage":[r"\bmax(?:imum)? coverage\b"],
 "problem.metric-voting":[r"\bmetric voting\b"],
 "problem.fair-division":[r"\bfair division\b"],
 "problem.envy-free-allocation":[r"\benvy.free allocation\b"],
 "property.ef1":[r"\bEF1\b"],
 "property.efx":[r"\bEFX\b"],
 "property.metric-distortion":[r"\bdistortion\b"],
 "property.price-of-anarchy":[r"\bprice of anarchy\b"],
 "property.price-of-stability":[r"\bprice of stability\b"],
 "game.congestion-game":[r"\bcongestion games?\b"],
 "auction.first-price-auction":[r"\bfirst.price auctions?\b"],
 "auction.second-price-auction":[r"\bsecond.price auctions?\b"],
 "model.mean-field-game":[r"\bmean field games?\b"],
 "problem.graph-property-testing":[r"\bgraph property testing\b"],
 "problem.uniformity-testing":[r"\buniformity testing\b"],
 "problem.monotonicity-testing":[r"\bmonotonicity testing\b"],
 "model.congest-model":[r"\bCONGEST model\b"],
 "model.local-model":[r"\bLOCAL model\b"],
 "problem.streaming-connectivity":[r"\bstreaming connectivity\b"],
 "technique.gibbs-sampling":[r"\bgibbs sampling\b",r"\bgibbs distributions?\b"],
 "technique.randomized-rounding":[r"\brandomized rounding\b"],
 "technique.primal-dual-method":[r"\bprimal.dual\b"],
 "technique.multiplicative-weights-update":[r"\bmultiplicative weights\b"],
 "technique.regularized-linear-programming":[r"\bregularized (?:linear programming|LP)\b"],
 "property.competitive-ratio":[r"\bcompetitive ratios?\b"],
 "property.regret":[r"\bregret\b"],
 "property.sample-complexity":[r"\bsample complexity\b"],
 "property.approximation-ratio":[r"\bapproximation ratios?\b"],
 "task.approximation-algorithm":[r"\bapproximation algorithms?\b"],
 "task.tight-lower-bound":[r"\blower bounds?\b"],
 "model.random-order-model":[r"\brandom.order\b"],
 "model.pac-learning":[r"\bPAC learning\b"],
}
# Reject overly broad or false-positive interpretations before constructing links.
REJECT={

 "problem.minimum-cut":[r"\bminimum k.cut\b",r"\bmultiway cut\b"],
 "problem.shortest-path":[r"\ball.pairs shortest paths?\b"],

}
ROLE={
 "lens":"lens","property":"metric","problem":"problem","technique":"technique",
 "model":"model","assumption":"assumption","task":"task","auction":"problem","game":"model",
 "equilibrium":"model","graph_class":"model","framework":"technique","objective":"metric"
}
def normalize_title(text):
    return re.sub(r"\s+"," ",re.sub(r"[^\w]+"," ",text.casefold(),flags=re.UNICODE)).strip()
def fetch(url,retries=3):
    last=None
    for attempt in range(retries):
        try:
            request=urllib.request.Request(url,headers={"User-Agent":USER_AGENT,"Accept":"application/json, application/xml;q=0.9"})
            with urllib.request.urlopen(request,timeout=45) as response:
                return response.read()
        except Exception as exc:
            last=exc
            if attempt+1<retries:time.sleep(2**attempt)
    raise RuntimeError("DBLP request failed: "+url+" ("+str(last)+")")
def author_list(author):
    if isinstance(author,str):return [author]
    if isinstance(author,dict):return [author.get("text","")] if author.get("text") else []
    if isinstance(author,list):return [x if isinstance(x,str) else x.get("text","") for x in author]
    return []
def search(query,limit=200):
    url="https://dblp.org/search/publ/api?"+urllib.parse.urlencode({"q":query,"h":limit,"format":"json"})
    data=json.loads(fetch(url))
    hits=data.get("result",{}).get("hits",{}).get("hit",[]) or []
    for hit in hits:
        info=hit.get("info") or {}
        title=re.sub(r"<[^>]+>","",str(info.get("title",""))).rstrip(". ")
        year=int(info.get("year") or 0)
        if not title or not 2018<=year<=2026:continue
        key=info.get("key") or hit.get("@id","")
        if not key:continue
        yield {"id":"dblp:"+key,"title":title,"year":year,
          "venue":str(info.get("venue") or "Unspecified"),"authors":author_list((info.get("authors") or {}).get("author")),
          "url":"https://dblp.org/rec/"+key,"dblp_key":key,
          "metadata_source":"DBLP search API"}
def profile(pid):
    url="https://dblp.org/pid/"+pid+".xml"
    root=ET.fromstring(fetch(url))
    for item in root:
        article=list(item)[0] if item.tag=="r" and len(item)>0 else item
        if article.tag not in {"article","inproceedings","informal","incollection"}:continue
        yeartext=article.findtext("year") or "0"
        try:year=int(yeartext)
        except ValueError:continue
        if not 2018<=year<=2026:continue
        title="".join(article.find("title").itertext()).strip(" .") if article.find("title") is not None else ""
        key=article.attrib.get("key","")
        if not title or not key:continue
        authors=["".join(x.itertext()) for x in article.findall("author")]
        venue=article.findtext("booktitle") or article.findtext("journal") or "Unspecified"
        yield {"id":"dblp:"+key,"title":title,"year":year,"venue":venue,
            "authors":authors,"url":"https://dblp.org/rec/"+key,"dblp_key":key,
            "metadata_source":"DBLP author XML"}
def annotate(paper,valid):
    title=paper["title"]
    found=[]
    for concept,patterns in PATTERNS.items():
        if concept not in valid:continue
        if any(re.search(p,title,re.I) for p in patterns) and not any(re.search(q,title,re.I) for q in REJECT.get(concept,[])):
            found.append({"primitive_id":concept,"role":ROLE.get(concept.split(".")[0],"model"),"evidence":"title_exact_phrase"})
    # One phrase may trigger both a broad lens and its variant. These are intentional
    # but are labeled title-derived, never inferred full-text use.
    if len(found)<2:return None
    return {**paper,"primitives":found,"review_status":"title_inferred_unverified",
      "link_evidence":"title_exact_phrase","source_id":None,
      "scope_note":"Labels inferred from explicit title terms only; paper content and mathematical uses NOT reviewed.",
      "authors_completeness":"dblp_metadata","status":"bibliographic_metadata",
      "source_url":paper["url"]}
def harvest(profiles,queries,valid,max_items):
    seen={}
    errors=[]
    for name,pid in profiles.items():
        try:
            for p in profile(pid):
                old=seen.get(normalize_title(p["title"]))
                if old is None or (old["metadata_source"]!="DBLP author XML"):
                    seen[normalize_title(p["title"])]=p
        except Exception as exc:
            errors.append({"source":"profile:"+name,"error":str(exc)})
    for query in queries:
        try:
            for p in search(query):
                seen.setdefault(normalize_title(p["title"]),p)
        except Exception as exc:
            errors.append({"source":"search:"+query,"error":str(exc)})
    proposed=[]
    for p in sorted(seen.values(),key=lambda p:(-p["year"],p["title"])):
        annotated=annotate(p,valid)
        if annotated:
            proposed.append(annotated)
            if len(proposed)>=max_items:break
    return proposed,errors,len(seen)
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--output",type=Path,default=DATA/"papers-harvested.json")
    ap.add_argument("--limit",type=int,default=4000)
    ap.add_argument("--dry-run",action="store_true")
    ap.add_argument("--strict",action="store_true",help="Fail if any upstream DBLP query fails.")
    args=ap.parse_args()
    if not 1<=args.limit<=10000:ap.error("limit must be between 1 and 10,000")
    valid={x["id"] for x in json.loads((DATA/"primitives.json").read_text())["items"]}
    proposed,errors,metadata_count=harvest(PROFILES,QUERIES,valid,args.limit)
    print(f"DBLP candidates scanned={metadata_count}, title-linked papers={len(proposed)}, source errors={len(errors)}")
    for e in errors:print("Warning:",e["source"],e["error"])
    if not proposed:
        raise SystemExit("No proposed records returned; refusing to overwrite existing corpus.")
    if args.strict and errors:raise SystemExit("Upstream errors; refusing to write partial harvest")
    output={"schema_version":"0.4.0","method":"DBLP titles with conservative lexical matching",
        "source":"DBLP CC0 bibliographic metadata",
        "licensing":"DBLP bibliography CC0; does not copy paper abstracts or full texts",
        "warning":"Each link is a title-derived hypothesis, NOT checked full-text primitive usage.",
        "items":proposed}
    if not args.dry_run:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(output,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
        print("Saved",args.output)
if __name__=="__main__":
    main()
