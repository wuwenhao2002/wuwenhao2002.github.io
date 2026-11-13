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
async function harness(hash="",options={}){
 let doc,resize;
 const viewport={width:options.width||800,height:options.height||600,left:0,top:0};
 class Element{
  constructor(tag="div"){
   this.tagName=tag.toUpperCase();this.children=[];this.className="";this.dataset={};this.style={};this.attributes={};
   this.value="";this.textContent="";this.hidden=false;this.events=new Map();
   this.classList={contains:c=>this.className.split(/\s+/).includes(c),
    toggle:(c,on)=>{const set=new Set(this.className.split(/\s+/).filter(Boolean));if(on)set.add(c);else set.delete(c);this.className=[...set].join(" ");},
    add:()=>{},remove:()=>{}};
  }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  get childElementCount(){return this.children.length;}
  get options(){return this.children.filter(c=>c.tagName==="OPTION");}
  setAttribute(k,v){this.attributes[k]=v;}
  getAttribute(k){return this.attributes[k];}
  addEventListener(type,fn){this.events.set(type,fn);}
  setPointerCapture(){}
  getBoundingClientRect(){return viewport;}
  getContext(){return {setTransform(){}};}
  focus(){doc.activeElement=this;}
  querySelectorAll(selector){return this.children.flatMap(c=>typeof c==="object"?[
    ...(selector==="button"&&c.tagName==="BUTTON"?[c]:[]),...c.querySelectorAll(selector)]:[]);}
 }
 const html=fs.readFileSync(path.join(root,"map.html"),"utf8");
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g))elements.get(m[1]).hidden=/\bhidden\b/.test(m[0]);
 for(const m of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
  for(const op of m[2].matchAll(/<option\b([^>]*)value="([^"]*)"([^>]*)>/g)){
   const option=new Element("option");option.value=op[2];elements.get(m[1]).append(option);
   if(/\bselected\b/.test(op[1]+op[3]))elements.get(m[1]).value=option.value;
  }
 }
 doc={activeElement:null,hidden:false,getElementById:id=>elements.get(id),createElement:tag=>new Element(tag),querySelectorAll:()=>[],addEventListener(){}};
 const location={pathname:"/tcs-ontology/map.html",search:"",hash},events=new Map();
 const primitives=[
  {id:"lens.prediction",name:"Prediction",kind:"lens",areas:["Learning Theory"],review_status:"source_checked"},
  {id:"problem.matching",name:"Matching",kind:"problem",areas:["Graph Algorithms"],review_status:"source_checked"},
  {id:"property.regret",name:"Regret",kind:"property",areas:["Learning Theory"],review_status:"source_checked"}
 ];
 const paper=(id,title,year,items=primitives)=>({id,title,year,authors:[],primitives:items.map(p=>({primitive_id:p.id}))});
 const fixtures=options.fixtures||{primitives,papers:[paper("one","Prediction for Matching",2025)],"papers-harvested":[paper("two","Online Matching",2026,primitives.slice(0,2))],sources:[]};
 const context={document:doc,window:{TCSGraphModel:G,TCSMapData:{load:async name=>fixtures[name]},matchMedia:()=>({matches:true}),addEventListener:(type,fn)=>events.set(type,fn)},
  location,history:{replaceState(_state,_title,url){location.hash=url.includes("#")?url.slice(url.indexOf("#")):"";}},
  URL,URLSearchParams,AbortController,setTimeout,clearTimeout,performance,devicePixelRatio:1,
  ResizeObserver:class{constructor(fn){resize=fn;}observe(){}},requestAnimationFrame(){},console};
 const source=fs.readFileSync(path.join(root,"map.js"),"utf8")
  .replace("function paperHref", "globalThis.__mapState=S;\nfunction paperHref");
 vm.runInNewContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(elements.get("mapError").textContent,"");
 return {elements,doc,location,events,state:context.__mapState,viewport,resize};
}

test("bibliography search, canvas counter and shared URL stay synchronized",async()=>{
 const {elements,location}=await harness("#select=lens.prediction&evidence=all");
 assert.equal(elements.get("paperCount").textContent,"2");
 assert.match(elements.get("mapCounter").textContent,/2 CONCEPTS/);
 elements.get("paperSearch").oninput({target:{value:"Online"}});
 assert.equal(elements.get("paperCount").textContent,"1");
 assert.match(elements.get("mapScope").textContent,/1 MATCHING PAPERS/);
 assert.match(elements.get("mapCounter").textContent,/1 CONCEPTS/);
 assert.equal(G.readView(location.hash).paperQuery,"Online");
 const reloaded=await harness(location.hash);
 assert.equal(reloaded.elements.get("paperSearch").value,"Online");
 assert.equal(reloaded.elements.get("paperEvidence").value,"all");
 assert.equal(reloaded.elements.get("paperCount").textContent,"1");
 reloaded.elements.get("paperSearch").oninput({target:{value:"no such paper"}});
 assert.equal(reloaded.elements.get("paperCount").textContent,"0");
 assert.match(reloaded.elements.get("mapCounter").textContent,/0 CONCEPTS/);
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

test("neighbor highlights use the exact current bibliography query",()=>{
 const papers=[
  {title:"Online prediction",primitives:[{primitive_id:"a"},{primitive_id:"b"}]},
  {title:"Private prediction",primitives:[{primitive_id:"a"},{primitive_id:"c"}]}
 ];
 const index=G.build(papers);
 assert.deepEqual([...G.related(index,["a"],"online").keys()],["b"]);
 assert.equal(G.related(index,["a"],"unknown").size,0);
 assert.deepEqual([...G.related(index,["a"]).keys()],["b","c"]);
});

test("fit bounds keep all nodes in a mobile viewport and handle empty data",()=>{
 const points=[{x:-390,y:-335},{x:381,y:331},{x:0,y:0}];
 const camera=G.fitView(points,360,310);
 assert.ok(camera.scale<.7);
 for(const p of points){
  const x=180+camera.x+p.x*camera.scale,y=155+camera.y+p.y*camera.scale;
  assert.ok(x>=35&&x<=325);assert.ok(y>=35&&y<=275);
 }
 assert.deepEqual(G.fitView([],360,310),{x:0,y:0,scale:1});
 assert.deepEqual(G.fitView([{x:Infinity,y:0}],360,310),{x:0,y:0,scale:1});
});

const screenPoint=(state,n)=>({clientX:state.size.w/2+state.view.x+(state.selected.size&&state.focus?n.fx:n.x)*state.view.scale,
 clientY:state.size.h/2+state.view.y+(state.selected.size&&state.focus?n.fy:n.y)*state.view.scale});
const pointer=(h,type,id,x,y)=>h.elements.get("stage").events.get(type)({pointerId:id,button:0,clientX:x,clientY:y});

test("resizing preserves user camera while Fit all uses active real-corpus bounds",async()=>{
 const read=name=>JSON.parse(fs.readFileSync(path.join(root,"data",name+".json"),"utf8")).items;
 const fixtures={primitives:read("primitives"),papers:read("papers"),"papers-harvested":[],sources:[]};
 const h=await harness("#select=lens.differential-privacy",{width:360,height:310,fixtures});
 const {state}=h;
 assert.ok(state.related.size>30);
 for(const n of state.nodes.filter(n=>state.selected.has(n.id)||state.related.has(n.id))){
  const pt=screenPoint(state,n);
  assert.ok(pt.clientX>=35&&pt.clientX<=325,n.id+" x outside fit");
  assert.ok(pt.clientY>=35&&pt.clientY<=275,n.id+" y outside fit");
 }
 h.elements.get("zoomIn").onclick();
 pointer(h,"pointerdown",1,150,150);pointer(h,"pointermove",1,175,172);pointer(h,"pointerup",1,175,172);
 const before={...state.view};
 h.viewport.width=500;h.viewport.height=440;h.resize();
 assert.deepEqual({...state.view},before);
 assert.equal(state.size.w,500);assert.equal(state.size.h,440);
 h.elements.get("resetView").onclick();
 assert.notDeepEqual({...state.view},before);
});

test("small cumulative pointer moves are a drag, not an accidental node click",async()=>{
 const h=await harness(),n=h.state.nodes[0],pt=screenPoint(h.state,n);
 const initialX=h.state.view.x;
 pointer(h,"pointerdown",1,pt.clientX,pt.clientY);
 for(let d=1;d<=6;d++)pointer(h,"pointermove",1,pt.clientX+d,pt.clientY);
 pointer(h,"pointerup",1,pt.clientX+6,pt.clientY);
 assert.equal(h.state.selected.size,0);
 assert.equal(h.state.view.x,initialX+6);
 assert.equal(h.state.pointers.size,0);assert.equal(h.state.gesture,null);
});

test("two pointers zoom about their centroid and never select on release",async()=>{
 const h=await harness("#select=lens.prediction"),before={...h.state.view};
 pointer(h,"pointerdown",1,300,300);pointer(h,"pointerdown",2,500,300);
 pointer(h,"pointermove",1,250,300);pointer(h,"pointermove",2,550,300);
 assert.ok(Math.abs(h.state.view.scale-before.scale*1.5)<1e-10);
 assert.ok(Math.abs(h.state.view.x-before.x*1.5)<1e-10);
 assert.ok(Math.abs(h.state.view.y-before.y*1.5)<1e-10);
 const current={...h.state.view};
 pointer(h,"pointermove",99,10,10);pointer(h,"pointerup",99,10,10);
 assert.deepEqual({...h.state.view},current);assert.equal(h.state.pointers.size,2);
 pointer(h,"pointerup",2,550,300);
 const selected=h.state.nodeMap.get("lens.prediction"),pt=screenPoint(h.state,selected);
 pointer(h,"pointermove",1,pt.clientX,pt.clientY);pointer(h,"pointerup",1,pt.clientX,pt.clientY);
 assert.equal(h.state.selected.size,1);
 assert.equal(h.state.pointers.size,0);assert.equal(h.state.gesture,null);
});

test("pointer cancellation and lost capture clean up gestures without selection",async()=>{
 const h=await harness(),pt=screenPoint(h.state,h.state.nodes[0]);
 pointer(h,"pointerdown",1,pt.clientX,pt.clientY);pointer(h,"pointerdown",2,pt.clientX+30,pt.clientY);
 pointer(h,"pointercancel",1,pt.clientX,pt.clientY);
 assert.equal(h.state.pointers.size,1);
 pointer(h,"lostpointercapture",2,pt.clientX+30,pt.clientY);
 assert.equal(h.state.pointers.size,0);assert.equal(h.state.gesture,null);assert.equal(h.state.selected.size,0);
 pointer(h,"pointerdown",3,pt.clientX,pt.clientY);pointer(h,"pointerup",3,pt.clientX,pt.clientY);
 assert.equal(h.state.selected.size,1);
});
