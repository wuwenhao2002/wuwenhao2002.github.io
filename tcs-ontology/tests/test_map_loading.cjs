"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const Graph=require("../map-model.js");
const root=path.resolve(__dirname,"..");

const primitives=[
 {id:"lens.prediction",name:"Prediction",kind:"lens",areas:["Learning Theory"],review_status:"source_checked"},
 {id:"problem.matching",name:"Matching",kind:"problem",areas:["Graph Algorithms"],review_status:"source_checked"},
 {id:"property.regret",name:"Regret",kind:"property",areas:["Learning Theory"],review_status:"source_checked"}
];
const paper=(id,title,items)=>({id,title,year:2026,authors:[],primitives:items.map(p=>({primitive_id:p.id}))});
const fixtures={primitives,papers:[paper("editorial","Prediction for Matching",primitives)],
 "papers-harvested":[paper("candidate","Online Prediction",primitives.slice(0,2))],sources:[]};

async function until(condition,message){
 for(let i=0;i<60;i++){
  if(condition())return;
  await new Promise(resolve=>setImmediate(resolve));
 }
 assert.fail(message);
}

// Run the real map event handlers with independently controlled data requests.
// The canvas drawing loop is idle; no browser, network or long timer is needed.
function harness(hash=""){
 let doc;
 class Element{
  constructor(tag="div"){
   this.tagName=tag.toUpperCase();this.children=[];this.className="";this.dataset={};this.style={};this.attributes={};
   this.value="";this.textContent="";this.hidden=false;this.disabled=false;this.events=new Map();
   this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:()=>{},remove:()=>{},
    toggle:(c,on)=>{const names=new Set(this.className.split(/\s+/).filter(Boolean));if(on)names.add(c);else names.delete(c);this.className=[...names].join(" ");}};
  }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  get childElementCount(){return this.children.length;}
  get options(){return this.children.filter(c=>c.tagName==="OPTION");}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name];}
  removeAttribute(name){delete this.attributes[name];}
  addEventListener(type,fn){this.events.set(type,fn);}
  setPointerCapture(){}
  getBoundingClientRect(){return {width:800,height:600,left:0,top:0};}
  getContext(){return {setTransform(){}};}
  focus(){doc.activeElement=this;}
  querySelectorAll(selector){return this.children.flatMap(c=>typeof c==="object"?[
   ...((selector==="button"&&c.tagName==="BUTTON"||selector==="option"&&c.tagName==="OPTION")?[c]:[]),...c.querySelectorAll(selector)]:[]);}
  querySelector(selector){const value=selector.match(/^option\[value=["']?([^"'\]]+)["']?\]$/)?.[1];return value?this.options.find(o=>o.value===value):this.querySelectorAll(selector)[0]||null;}
 }
 const html=fs.readFileSync(path.join(root,"map.html"),"utf8");
 const elements=new Map([...html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)].map(m=>{
  const element=new Element(m[1]);element.hidden=/\bhidden\b/.test(m[2]);element.disabled=/\bdisabled\b/.test(m[2]);
  return [m[3],element];
 }));
 for(const select of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
  const element=elements.get(select[1]);
  for(const option of select[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)){
   const item=new Element("option");item.value=option[1].match(/\bvalue="([^"]*)"/)?.[1]||"";
   item.disabled=/\bdisabled\b/.test(option[1]);item.selected=/\bselected\b/.test(option[1]);item.textContent=option[2];element.append(item);
  }
  element.value=(element.options.find(o=>o.selected)||element.options[0])?.value||"";
 }
 doc={activeElement:null,hidden:false,getElementById:id=>elements.get(id),createElement:tag=>new Element(tag),querySelectorAll:()=>[],addEventListener(){}};
 const location={pathname:"/tcs-ontology/map.html",search:"",hash},events=new Map(),requests=[];
 const load=(name,options={})=>new Promise((resolve,reject)=>{
  const request={name,options,settled:false};
  request.resolve=value=>{if(!request.settled){request.settled=true;resolve(value);}};
  request.reject=error=>{if(!request.settled){request.settled=true;reject(error);}};
  options.signal?.addEventListener("abort",()=>request.reject(options.signal.reason||new Error("Aborted")),{once:true});
  requests.push(request);
 });
 const context={document:doc,window:{TCSGraphModel:Graph,TCSMapData:{load},matchMedia:()=>({matches:true}),addEventListener:(type,fn)=>events.set(type,fn)},
  location,history:{replaceState(_state,_title,url){location.hash=url.includes("#")?url.slice(url.indexOf("#")):"";}},
  URL,URLSearchParams,AbortController,DOMException,setTimeout,clearTimeout,performance,devicePixelRatio:1,
  ResizeObserver:class{observe(){}},requestAnimationFrame(){},console:{error(){},warn(){},log(){}}};
 const source=fs.readFileSync(path.join(root,"map.js"),"utf8").replace("function paperHref","globalThis.__mapState=S;\nfunction paperHref");
 vm.runInNewContext(source,context);
 const pending=name=>requests.filter(r=>r.name===name&&!r.settled);
 const resolve=name=>{const selected=pending(name);assert.ok(selected.length,"Expected pending "+name+" request");selected.forEach(r=>r.resolve(fixtures[name]));};
 const reject=(name,message)=>{const selected=pending(name);assert.ok(selected.length,"Expected pending "+name+" request");selected.forEach(r=>r.reject(new Error(message)));};
 const trigger=(id,type,value)=>{
  const element=elements.get(id);if(value!==undefined)element.value=value;
  const event={target:element,currentTarget:element,preventDefault(){}};
  element["on"+type]?.(event);element.events.get(type)?.(event);
 };
 const option=value=>elements.get("paperEvidence").options.find(o=>o.value===value);
 return {elements,location,events,requests,pending,resolve,reject,trigger,option,state:context.__mapState};
}

async function resolveCore(h){
 await until(()=>h.pending("primitives").length&&h.pending("papers").length,"Core requests did not start");
 h.resolve("primitives");h.resolve("papers");
 await until(()=>h.state.ready,"Core graph is blocked by auxiliary data");
}

async function resolveSupplementary(h){
 await until(()=>h.pending("sources").length&&h.pending("papers-harvested").length,"Supplementary requests did not start");
 h.resolve("sources");h.resolve("papers-harvested");
 await until(()=>!h.option("all").disabled&&!h.option("harvested").disabled,"Recovered evidence options remain disabled");
}

test("editorial graph is usable while supplementary requests are pending",async()=>{
 const h=harness("#select=lens.prediction");
 await resolveCore(h);
 assert.equal(h.state.nodes.length,primitives.length);
 assert.equal(h.elements.get("paperCount").textContent,"1");
 assert.equal(h.elements.get("mapError").hidden,true);
 assert.equal(h.option("all").disabled,true);
 assert.equal(h.option("harvested").disabled,true);
 assert.equal(h.elements.get("mapSearch").disabled,false);
 await resolveSupplementary(h);
 assert.equal(h.state.nodes.length,primitives.length);
});

test("a requested combined evidence view activates after supplementary success",async()=>{
 const h=harness("#select=lens.prediction&evidence=all");
 await resolveCore(h);
 assert.equal(h.elements.get("paperCount").textContent,"1");
 await resolveSupplementary(h);
 await until(()=>h.elements.get("paperEvidence").value==="all","Requested evidence view was lost while loading");
 assert.equal(h.elements.get("paperCount").textContent,"2");
 assert.equal(h.state.evidence,"all");
});

test("a newer evidence choice supersedes a pending URL request",async()=>{
 const h=harness("#select=lens.prediction&evidence=all");
 await resolveCore(h);
 h.trigger("paperEvidence","change","curated");
 await resolveSupplementary(h);
 assert.equal(h.elements.get("paperEvidence").value,"curated");
 assert.equal(h.state.evidence,"curated");
 assert.equal(h.elements.get("paperCount").textContent,"1");
});

test("supplementary failure is visible, keeps editorial data and can be retried",async()=>{
 const h=harness("#select=lens.prediction&evidence=all");
 await resolveCore(h);
 await until(()=>h.pending("sources").length&&h.pending("papers-harvested").length,"Missing supplementary requests");
 h.resolve("sources");h.reject("papers-harvested","Supplementary fixture unavailable");
 await until(()=>!h.elements.get("retryMapData").hidden,"Optional failure did not expose retry");
 assert.equal(h.elements.get("mapLoadStatus").hidden,false);
 assert.match(h.elements.get("mapLoadMessage").textContent,/unavailable|failed|could not|retry/i);
 assert.equal(h.elements.get("mapError").hidden,true);
 assert.equal(h.elements.get("paperCount").textContent,"1");
 assert.equal(h.option("all").disabled,true);
 assert.equal(h.option("harvested").disabled,true);
 const count=h.requests.length;h.trigger("retryMapData","click");
 await until(()=>h.requests.length>count,"Retry did not start data requests");
 assert.equal(h.pending("sources").length,0,"Retry should retain successfully loaded source references");
 h.resolve("papers-harvested");
 await until(()=>!h.option("all").disabled&&!h.option("harvested").disabled,"Recovered evidence options remain disabled");
 await until(()=>h.elements.get("paperCount").textContent==="2","Retry did not restore requested combined evidence");
 assert.equal(h.state.nodes.length,primitives.length);
 assert.equal(new Set(h.state.nodes.map(n=>n.id)).size,primitives.length);
});

test("mandatory failure is an error and retry initializes exactly one graph",async()=>{
 const h=harness("#select=lens.prediction");
 assert.equal(h.elements.get("mapSearch").disabled,true);
 await until(()=>h.pending("primitives").length&&h.pending("papers").length,"Core requests did not start");
 h.resolve("primitives");h.reject("papers","Editorial fixture unavailable");
 await until(()=>!h.elements.get("mapError").hidden&&!h.elements.get("retryMapData").hidden,"Core failure was not exposed");
 assert.match(h.elements.get("mapError").textContent,/could not load|unavailable|failed/i);
 assert.equal(h.state.ready,false);
 assert.equal(h.state.nodes.length,0);
 assert.equal(h.elements.get("mapSearch").disabled,true);
 h.trigger("retryMapData","click");
 await resolveCore(h);
 await resolveSupplementary(h);
 assert.equal(h.elements.get("mapError").hidden,true);
 assert.equal(h.elements.get("paperCount").textContent,"1");
 assert.equal(h.state.nodes.length,primitives.length);
 assert.equal(h.elements.get("mapArea").options.filter(o=>o.value==="Learning Theory").length,1);
});

test("source-reference failure does not hide a successfully loaded candidate layer",async()=>{
 const h=harness("#select=lens.prediction&evidence=all");
 await resolveCore(h);
 await until(()=>h.pending("sources").length&&h.pending("papers-harvested").length,"Missing supplementary requests");
 h.reject("sources","Source registry unavailable");h.resolve("papers-harvested");
 await until(()=>!h.elements.get("retryMapData").hidden&&h.elements.get("paperCount").textContent==="2","Source-only failure hid the candidate layer");
 assert.match(h.elements.get("mapLoadMessage").textContent,/source references are unavailable/i);
 assert.equal(h.option("all").disabled,false);
 assert.equal(h.option("harvested").disabled,false);
 const count=h.requests.length;h.trigger("retryMapData","click");
 await until(()=>h.requests.length>count,"Source retry did not start");
 assert.equal(h.pending("papers-harvested").length,0,"Retry should retain successfully loaded candidates");
 h.resolve("sources");
 await until(()=>h.elements.get("mapLoadStatus").hidden,"Successful source retry did not clear the warning");
 assert.equal(h.elements.get("paperCount").textContent,"2");
});
