"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const G=require("../map-model.js");
const root=path.resolve(__dirname,"..");

test("shared map view round-trips filters and exact primitive selections",()=>{
 const view={selected:["lens.prediction","problem.matching"],term:"prediction & privacy",paperQuery:"2026 + online",
   area:"Online Algorithms",review:"source_checked",evidence:"all",focus:false};
 assert.deepEqual(G.readView(G.writeView(view)),view);
 assert.equal(G.writeView(G.readView("")),"");
});

test("legacy links work and unrecognized state is discarded",()=>{
 const ids=new Set(["lens.prediction","problem.matching"]),areas=new Set(["Learning Theory"]);
 assert.deepEqual(G.readView("#lens.prediction",ids).selected,["lens.prediction"]);
 assert.deepEqual(G.readView("#select=lens.prediction%2Cproblem.matching",ids).selected,[...ids]);
 const view=G.readView("#select=lens.prediction,missing,lens.prediction&evidence=invalid&review=invalid&area=missing",ids,areas);
 assert.deepEqual(view.selected,["lens.prediction"]);
 assert.equal(view.evidence,"curated");assert.equal(view.review,"all");assert.equal(view.area,"");
 assert.doesNotThrow(()=>G.readView("#%invalid"));
});

// Exercise actual map event handlers without a canvas/browser dependency.
async function harness(hash=""){
 let doc;
 class Element{
  constructor(tag="div"){
   this.tagName=tag.toUpperCase();this.children=[];this.className="";this.dataset={};this.style={};this.attributes={};
   this.value="";this.textContent="";this.hidden=false;
   this.classList={contains:c=>this.className.split(/\s+/).includes(c),
    toggle:(c,on)=>{const set=new Set(this.className.split(/\s+/).filter(Boolean));if(on)set.add(c);else set.delete(c);this.className=[...set].join(" ");},
    add:()=>{},remove:()=>{}};
  }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  get childElementCount(){return this.children.length;}
  setAttribute(k,v){this.attributes[k]=v;}
  getAttribute(k){return this.attributes[k];}
  addEventListener(){}
  getBoundingClientRect(){return {width:800,height:600,left:0,top:0};}
  getContext(){return {setTransform(){}};}
  focus(){doc.activeElement=this;}
  querySelectorAll(selector){return this.children.flatMap(c=>typeof c==="object"?[
    ...(selector==="button"&&c.tagName==="BUTTON"?[c]:[]),...c.querySelectorAll(selector)]:[]);}
 }
 const elements=new Map([...fs.readFileSync(path.join(root,"map.html"),"utf8").matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 doc={activeElement:null,hidden:false,getElementById:id=>elements.get(id),createElement:tag=>new Element(tag),querySelectorAll:()=>[],addEventListener(){}};
 const location={pathname:"/tcs-ontology/map.html",search:"",hash},events=new Map();
 const primitives=[
  {id:"lens.prediction",name:"Prediction",kind:"lens",areas:["Learning Theory"],review_status:"source_checked"},
  {id:"problem.matching",name:"Matching",kind:"problem",areas:["Graph Algorithms"],review_status:"source_checked"}
 ];
 const paper=(id,title,year)=>({id,title,year,authors:[],primitives:primitives.map(p=>({primitive_id:p.id}))});
 const fixtures={primitives,papers:[paper("one","Prediction for Matching",2025)],"papers-harvested":[paper("two","Online Matching",2026)],sources:[]};
 const context={document:doc,window:{TCSGraphModel:G,matchMedia:()=>({matches:true}),addEventListener:(type,fn)=>events.set(type,fn)},
  location,history:{replaceState(_state,_title,url){location.hash=url.includes("#")?url.slice(url.indexOf("#")):"";}},
  fetch:async url=>({ok:true,json:async()=>({items:fixtures[url.match(/([^/]+)\.json$/)[1]]})}),
  URL,URLSearchParams,AbortController,setTimeout,clearTimeout,performance,devicePixelRatio:1,
  ResizeObserver:class{observe(){}},requestAnimationFrame(){},console};
 vm.runInNewContext(fs.readFileSync(path.join(root,"map.js"),"utf8"),context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(elements.get("mapError").textContent,"");
 return {elements,doc,location,events};
}

test("bibliography search, canvas counter and shared URL stay synchronized",async()=>{
 const {elements,location}=await harness("#select=lens.prediction&evidence=all");
 assert.equal(elements.get("paperCount").textContent,"2");
 elements.get("paperSearch").oninput({target:{value:"Online"}});
 assert.equal(elements.get("paperCount").textContent,"1");
 assert.match(elements.get("mapScope").textContent,/1 MATCHING PAPERS/);
 assert.equal(G.readView(location.hash).paperQuery,"Online");
 const reloaded=await harness(location.hash);
 assert.equal(reloaded.elements.get("paperSearch").value,"Online");
 assert.equal(reloaded.elements.get("paperEvidence").value,"all");
 assert.equal(reloaded.elements.get("paperCount").textContent,"1");
 reloaded.location.hash="#select=problem.matching&evidence=curated";
 reloaded.events.get("hashchange")();
 assert.equal(reloaded.elements.get("paperSearch").value,"");
 assert.equal(reloaded.elements.get("paperCount").textContent,"1");
});

test("selecting from keyboard index restores focus and pressed state",async()=>{
 const {elements,doc}=await harness();
 const button=elements.get("mapMatches").querySelectorAll("button").find(b=>b.dataset.primitiveId==="lens.prediction");
 button.focus();button.onclick();
 assert.notEqual(doc.activeElement,button);
 assert.equal(doc.activeElement.dataset.primitiveId,"lens.prediction");
 assert.equal(doc.activeElement.getAttribute("aria-pressed"),"true");
 doc.activeElement.onclick();
 assert.equal(doc.activeElement.dataset.primitiveId,"lens.prediction");
 assert.equal(doc.activeElement.getAttribute("aria-pressed"),"false");
});

test("motion control names its action when reduced motion is preferred",async()=>{
 const {elements}=await harness();
 const motion=elements.get("motionToggle");
 assert.equal(motion.getAttribute("aria-pressed"),"true");
 assert.equal(motion.getAttribute("aria-label"),"Resume motion");
 motion.onclick();
 assert.equal(motion.getAttribute("aria-pressed"),"false");
 assert.equal(motion.getAttribute("aria-label"),"Pause motion");
});
