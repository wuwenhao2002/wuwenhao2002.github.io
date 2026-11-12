#!/usr/bin/env python3
"""Crossref bibliographic metadata backup for paper-driven TCS Ontology.

Only uses bibliographic facts and explicitly written TITLE patterns.
Every primitive association is flagged as title_inferred_unverified.
No full-text or abstracts are collected or interpreted.
"""
from __future__ import annotations
import argparse,json,re,sys,time,urllib.parse,urllib.request
from pathlib import Path
from harvest_papers import annotate,normalize_title,PATTERNS,USER_AGENT

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
QUERIES=[
 "learning augmented online algorithms predictions",
 "online algorithms with predictions",
 "binary search distributional predictions",
 "online matching with predictions",
 "ski rental prediction",
 "differentially private graph algorithms",
 "differential privacy graph cuts",
 "differential privacy densest subgraph",
 "differentially private shortest paths",
 "differentially private approximation",
 "algorithmic sensitivity graph algorithms",
 "average sensitivity graph matching",
 "low sensitivity approximation algorithms",
 "Lipschitz continuous graph algorithms",
 "stable matching approximation algorithms",
 "private metric voting sensitivity",
 "fault tolerant graph spanners",
 "online algorithms with recourse",
 "price of anarchy congestion games",
 "price of anarchy auctions",
 "online bipartite matching prediction",
 "property testing graphs monotonicity",
 "replicable online learning bandits",
 "fair division EFX",
 "maximal matching distributed algorithms",
 "streaming graph matching",
 "random order model regret",
 "sample complexity differential privacy",
]
def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":USER_AGENT,"Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=23) as r:
        raw=r.read()
    return json.loads(raw.decode("utf-8"))
def authors_of(item):
    return [(str(a.get("given","")).strip()+" "+str(a.get("family","")).strip()).strip()
            for a in item.get("author",[]) if a.get("family")]
def record(item):
    title=item.get("title") or []
    title=re.sub(r"<[^>]+>","",str(title[0] if title else "")).strip().rstrip(".")
    doi=str(item.get("DOI","")).strip()
    years=[]
    for key in ("published","published-print","published-online","created"):
        parts=(item.get(key) or {}).get("date-parts") or []
        if parts and parts[0] and isinstance(parts[0][0],int):
            years.append(parts[0][0])
    year=min(years) if years else 0
    if not doi or not title or not 2018<=year<=2026:return None
    venue=item.get("container-title") or []
    venue=str(venue[0] if venue else "Unspecified")
    return {"id":"crossref:"+doi.lower(),"title":title,"year":year,"venue":venue,
       "authors":authors_of(item),"url":"https://doi.org/"+doi,
       "crossref_doi":doi,"metadata_source":"Crossref REST API"}
def harvest(limit=3000,rows=180):
    ids={x["id"] for x in json.loads((DATA/"primitives.json").read_text(encoding="utf-8"))["items"]}
    seen={},[]
    matched,errors=seen
    for query in QUERIES:
        params=urllib.parse.urlencode({"query.title":query,"rows":rows,
         "filter":"from-pub-date:2018-01-01,until-pub-date:2026-11-13",
         "select":"DOI,title,author,published,published-print,published-online,created,container-title,type"})
        try:
            payload=get("https://api.crossref.org/works?"+params)
            for raw in (payload.get("message") or {}).get("items",[]):
                p=record(raw)
                if not p:continue
                key=normalize_title(p["title"])
                if not key or key in matched:continue
                classified=annotate(p,ids)
                if classified:matched[key]=classified
        except Exception as exc:
            errors.append({"query":query,"error":str(exc)})
        time.sleep(.45)
    return sorted(matched.values(),key=lambda x:(-x["year"],x["title"]))[:limit],errors
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,default=DATA/"papers-proposed.json")
    ap.add_argument("--limit",type=int,default=3500)
    ap.add_argument("--rows",type=int,default=180)
    args=ap.parse_args()
    if not 1<=args.rows<=500:ap.error("rows must be 1..500")
    result,errors=harvest(args.limit,args.rows)
    print("Crossref selected",len(result),"records; query errors",len(errors),flush=True)
    for e in errors:print("Warning:",e,flush=True)
    if not result:raise SystemExit("No matching Crossref titles; refusing to emit empty corpus")
    out={"schema_version":"0.4.0","method":"Crossref metadata with conservative explicit-title phrase matching",
     "source":"Crossref REST API","warning":"Title-derived primitive labels are unreviewed and may be false positives. Paper contents not checked.",
     "items":result}
    args.output.write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("Saved",args.output,flush=True)
if __name__=="__main__":main()
