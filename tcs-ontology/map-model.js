/* TCS Ontology: paper-defined co-occurrence, no inferred or manually drawn edges. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object" && module.exports)module.exports=api;
  else root.TCSGraphModel=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function key(title){
    return String(title||"").normalize("NFKD").toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
  }
  function mergePapers(curated=[],harvested=[]){
    const out=[],titles=new Set(),ids=new Set();
    for(const source of [curated,harvested]){
      for(const p of source){
        if(!p||typeof p.title!=="string"||!Array.isArray(p.primitives))continue;
        const normalized=key(p.title);
        if(!normalized||titles.has(normalized)||ids.has(p.id))continue;
        titles.add(normalized);ids.add(p.id);out.push(p);
      }
    }
    return out;
  }
  function build(papers=[],validIds=null){
    const clean=[],byPrimitive=new Map();
    for(const paper of papers){
      const unique=new Map();
      for(const linked of paper.primitives||[]){
        const id=linked?.primitive_id;
        if(typeof id!=="string"||(validIds&&!validIds.has(id)))continue;
        if(!unique.has(id))unique.set(id,{primitive_id:id,role:linked.role||"related"});
      }
      if(!unique.size)continue;
      const index=clean.length;
      const p={...paper,primitives:[...unique.values()]};
      clean.push(p);
      for(const id of unique.keys()){
        if(!byPrimitive.has(id))byPrimitive.set(id,new Set());
        byPrimitive.get(id).add(index);
      }
    }
    return {papers:clean,byPrimitive};
  }
  function intersect(index,selected=[]){
    const ids=[...new Set(selected)];
    if(ids.length===0)return index.papers.map((_,i)=>i);
    const sets=ids.map(id=>index.byPrimitive.get(id)||new Set());
    if(sets.some(s=>s.size===0))return [];
    sets.sort((a,b)=>a.size-b.size);
    return [...sets[0]].filter(i=>sets.every(s=>s.has(i)));
  }
  function related(index,selected=[],query=""){
    if(!selected.length)return new Map();
    const ids=new Set(selected),counts=new Map();
    for(const paper of matching(index,selected,query)){
      for(const link of paper.primitives){
        const id=link.primitive_id;if(ids.has(id))continue;
        counts.set(id,(counts.get(id)||0)+1);
      }
    }
    return counts;
  }
  function matching(index,selected=[],query=""){
    const q=String(query).toLowerCase().trim();
    return intersect(index,selected).map(i=>index.papers[i])
      .filter(p=>!q||[p.title,p.venue,p.year,...(p.authors||[])]
        .some(s=>String(s||"").toLowerCase().includes(q)))
      .sort((a,b)=>Number(b.year||0)-Number(a.year||0)||a.title.localeCompare(b.title));
  }
  function fitView(points=[],width=100,height=100,maxScale=1.4){
    const valid=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(!valid.length)return {x:0,y:0,scale:1};
    const xs=valid.map(p=>p.x),ys=valid.map(p=>p.y);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    const scale=Math.min(maxScale,Math.max(.03,Math.min(
      (Math.max(100,width)-72)/Math.max(80,right-left),
      (Math.max(100,height)-72)/Math.max(80,bottom-top))));
    return {x:-(left+right)*scale/2,y:-(top+bottom)*scale/2,scale};
  }
  function readView(hash="",validIds=null,validAreas=null){
    const raw=String(hash).replace(/^#/,""),params=new URLSearchParams(raw.includes("=")?raw:"");
    let legacy="";
    if(raw&&!raw.includes("=")){try{legacy=decodeURIComponent(raw);}catch{legacy="";}}
    const selected=[...new Set((params.get("select")||legacy).split(","))]
      .filter(id=>id&&(!validIds||validIds.has(id)));
    const area=params.get("area")||"";
    return {selected,term:params.get("q")||"",paperQuery:params.get("paper")||"",
      area:!validAreas||validAreas.has(area)?area:"",
      review:params.get("review")==="source_checked"?"source_checked":"all",
      evidence:["all","harvested"].includes(params.get("evidence"))?params.get("evidence"):"curated",
      focus:params.get("focus")!=="0"};
  }
  function writeView(view){
    const params=new URLSearchParams();
    if(view.selected?.length)params.set("select",[...new Set(view.selected)].join(","));
    if(view.term)params.set("q",view.term);
    if(view.area)params.set("area",view.area);
    if(view.review==="source_checked")params.set("review",view.review);
    if(["all","harvested"].includes(view.evidence))params.set("evidence",view.evidence);
    if(view.paperQuery)params.set("paper",view.paperQuery);
    if(view.focus===false)params.set("focus","0");
    return params.size?"#"+params.toString():"";
  }
  return {key,mergePapers,build,intersect,related,matching,fitView,readView,writeView};
});
