"use strict";
/* All highlights and filtered paper lists are computed exclusively from stored paper memberships. */
(()=>{
const $=id=>document.getElementById(id),stage=$("stage"),canvas=$("mapCanvas"),ctx=canvas.getContext("2d");
const Graph=window.TCSGraphModel;
if(!Graph){$("mapError").hidden=false;$("mapError").textContent="Graph model could not load.";return;}
const state={nodes:[],nodeById:new Map(),items:[],papersCurated:[],papersHarvested:[],sources:[],centers:new Map(),
  graph:Graph.build([]),selected:new Set(),related:new Map(),selectedPapers:[],
  hovered:null,search:"",area:"",status:"all",evidence:"all",paperSearch:"",
  panX:0,panY:0,scale:1,w:0,h:0,dpr:1,paused:false,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,
  dragging:false,dragged:false,lastX:0,lastY:0,lastTime:0,frame:0,visiblePapers:40};
const make=(tag,cls="",text="")=>{const x=document.createElement(tag);x.className=cls;x.textContent=text;return x;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const rand=(s,n)=>hash(s+"|"+n)/4294967295;
const hue=s=>150+Math.round(rand(s,3)*140);
const source=id=>state.sources.find(s=>s.id===id);
function link(root,title,url,cls="paper-source"){try{const u=new URL(url,location.href);if(u.protocol!=="https:")return;const a=make("a",cls,title+" ↗");a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";root.append(a);}catch{}}
function setupNodes(){
 const areas=[...new Set(state.items.map(p=>p.areas[0]))].sort();
 const groups=new Map(areas.map(a=>[a,[]]));
 // All primitives are nodes, even if no indexed paper mentions them.
 for(const p of state.items)groups.get(p.areas[0]).push(p);
 areas.forEach((area,i)=>{const angle=2.39996323*i,r=110+210*Math.sqrt(i+.4);state.centers.set(area,{x:Math.cos(angle)*r*1.13,y:Math.sin(angle)*r*.87});});
 for(const area of areas){
  const nodes=groups.get(area).sort((a,b)=>a.id.localeCompare(b.id)),c=state.centers.get(area);
  nodes.forEach((p,i)=>{const theta=2.39996323*i+rand(p.id,4)*.6,r=15+16*Math.sqrt(i);
   const n={id:p.id,p,area,x:c.x+Math.cos(theta)*r*(.82+rand(p.id,5)*.3),y:c.y+Math.sin(theta)*r*(.75+rand(p.id,6)*.22),
      radius:p.kind==="lens"?5.7:p.review_status==="source_checked"?3.1:2.3,phase:rand(p.id,7)*6.28,phase2:rand(p.id,8)*6.28};
   state.nodes.push(n);state.nodeById.set(n.id,n);
  });
 }
}
function visible(n){return state.selected.has(n.id)||(!state.area||n.p.areas.includes(state.area))&&(state.status==="all"||n.p.review_status===state.status);}
function pos(n,t=0){const move=state.paused||state.reduced?0:1;return{x:state.w/2+state.panX+(n.x+Math.sin(t*.44+n.phase)*2.4*move)*state.scale,y:state.h/2+state.panY+(n.y+Math.cos(t*.35+n.phase2)*2.2*move)*state.scale};}
function resize(){const b=stage.getBoundingClientRect();state.w=Math.max(100,b.width);state.h=Math.max(100,b.height);state.dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(state.w*state.dpr);canvas.height=Math.round(state.h*state.dpr);ctx.setTransform(state.dpr,0,0,state.dpr,0,0);draw();}
function fit(){if(!state.nodes.length)return;const x=Math.max(...state.nodes.map(n=>Math.abs(n.x)))+65,y=Math.max(...state.nodes.map(n=>Math.abs(n.y)))+65;state.scale=clamp(Math.min((state.w-60)/(2*x),(state.h-60)/(2*y)),.13,2);state.panX=0;state.panY=0;draw();}
function matchingPrimitive(n){const q=state.search.toLowerCase().trim();return !q||[n.p.id,n.p.name,...n.p.aliases].some(s=>s.toLowerCase().includes(q));}
function color(n){
 if(state.selected.has(n.id))return "#f9c584";
 if(state.selected.size>0){
   if(state.related.has(n.id))return "#8be9bc";
   return "#354c53";
 }
 if(n.p.kind==="lens")return "#f4c48b";
 if(n.p.review_status==="source_checked")return "hsl("+hue(n.area)+",65%,70%)";
 return "#527077";
}
function draw(t=state.lastTime){
 if(!state.nodes.length)return;state.lastTime=t;
 ctx.fillStyle="#0b191d";ctx.fillRect(0,0,state.w,state.h);
 const grid=Math.max(21,57*state.scale);
 ctx.strokeStyle="rgba(94,152,134,.06)";ctx.lineWidth=.65;
 for(let x=(state.w/2+state.panX)%grid;x<state.w;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,state.h);ctx.stroke();}
 for(let y=(state.h/2+state.panY)%grid;y<state.h;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(state.w,y);ctx.stroke();}
 for(const [area,c] of state.centers){
   if(state.area&&area!==state.area)continue;
   const x=state.w/2+state.panX+c.x*state.scale,y=state.h/2+state.panY+c.y*state.scale;
   if(x< -300||x>state.w+300||y< -300||y>state.h+300)continue;
   ctx.beginPath();ctx.arc(x,y,78*state.scale+14,0,Math.PI*2);ctx.strokeStyle="hsla("+hue(area)+",60%,65%,.13)";ctx.stroke();
   ctx.font="10px monospace";ctx.fillStyle="#628e85";ctx.textAlign="center";ctx.fillText(area.toUpperCase().slice(0,28),x,y-78*state.scale-13);
 }
 // Highlighted edges only exist if a paper contains all selected primitive IDs.
 if(state.selected.size>0){
   ctx.lineWidth=1.1;ctx.strokeStyle="rgba(133,236,187,.26)";
   const selectedNodes=[...state.selected].map(id=>state.nodeById.get(id)).filter(Boolean);
   for(const [id] of state.related){
     const n=state.nodeById.get(id);if(!n||!visible(n))continue;
     const b=pos(n,t);
     for(const x of selectedNodes){const a=pos(x,t);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
   }
 }
 let rendered=0;
 const labels=[];
 for(const n of state.nodes){
  if(!visible(n))continue;
  const pt=pos(n,t);if(pt.x<-35||pt.x>state.w+35||pt.y<-35||pt.y>state.h+35)continue;
  rendered++;const isSelected=state.selected.has(n.id),isRelated=state.related.has(n.id),hit=matchingPrimitive(n);
  const emphasized=isSelected||isRelated||n===state.hovered,rad=Math.max(n.p.kind==="lens"?4:2,n.radius*state.scale*(emphasized?1.6:1));
  ctx.globalAlpha=state.search&&!hit&&!isSelected?.15:state.selected.size&&!emphasized?.43:1;
  if(isSelected||n===state.hovered){ctx.beginPath();ctx.arc(pt.x,pt.y,rad+7,0,Math.PI*2);ctx.strokeStyle=isSelected?"#ffdfaa":"#adf7d8";ctx.lineWidth=isSelected?2:1.3;ctx.stroke();}
  ctx.beginPath();ctx.arc(pt.x,pt.y,rad,0,Math.PI*2);ctx.fillStyle=color(n);ctx.fill();
  ctx.globalAlpha=1;
  if(isSelected||n===state.hovered||state.search&&hit||state.scale>1.3&&(isRelated||n.p.kind==="lens")){
    labels.push({x:pt.x+rad+6,y:pt.y+3,label:n.p.name,kind:isSelected?2:isRelated?1:0});
  }
 }
 labels.sort((a,b)=>a.kind-b.kind);
 ctx.textAlign="left";
 for(const l of labels.slice(-70)){
   ctx.fillStyle=l.kind===2?"#ffdda5":l.kind===1?"#ade6c6":"#b5d5c7";
   ctx.font=(l.kind===2?"bold 13":"11")+"px sans-serif";
   ctx.fillText(l.label,l.x,l.y,170);
 }
 $("mapCounter").textContent=state.selected.size?
   state.related.size+" linked primitives · "+state.graph.papers.length+" indexed papers":
   state.nodes.length+" primitive nodes";
}
function hit(x,y){let picked=null,min=16;for(const n of state.nodes){if(!visible(n))continue;const p=pos(n),dist=Math.hypot(x-p.x,y-p.y);if(dist<Math.max(9,n.radius*state.scale+5)&&dist<min){min=dist;picked=n;}}return picked;}
function setSelection(ids,updateUrl=true){
 state.selected=new Set(ids.filter(x=>state.nodeById.has(x)));
 state.visiblePapers=40;
 state.related=Graph.related(state.graph,[...state.selected]);
 state.selectedPapers=Graph.matching(state.graph,[...state.selected]);
 renderSelected();renderPapers();matches();draw();
 if(updateUrl)history.replaceState(null,"",state.selected.size?"#select="+encodeURIComponent([...state.selected].join(",")):"./map.html");
}
function toggle(n,center=false){if(!n)return;const list=[...state.selected];if(state.selected.has(n.id))list.splice(list.indexOf(n.id),1);else list.push(n.id);if(center){state.panX=-n.x*state.scale;state.panY=-n.y*state.scale;}setSelection(list);}
function renderSelected(){
 const root=$("selectedChips");root.replaceChildren();
 if(!state.selected.size){root.append(make("span","no-selected","Click any node to begin. Click another to add a condition."));return;}
 for(const id of state.selected){
   const node=state.nodeById.get(id);if(!node)continue;
   const chip=make("button","selected-chip",node.p.name+"  ×");chip.type="button";chip.title="Remove "+node.p.name;chip.onclick=()=>toggle(node);root.append(chip);
 }
}
function renderPapers(){
 const root=$("mapDetail");root.replaceChildren();
 if(!state.selected.size){
  $("paperCount").textContent="—";$("morePapers").disabled=true;
  root.append(make("div","empty","Select one or more primitives. Only papers containing every selected primitive will appear."));return;
 }
 const filtered=Graph.matching(state.graph,[...state.selected],state.paperSearch);
 $("paperCount").textContent=filtered.length.toLocaleString();
 $("mapHeading").textContent=[...state.selected].map(id=>state.nodeById.get(id)?.p.name||id).join(" + ");
 if(!filtered.length){
  root.append(make("div","empty","No indexed papers match all selected primitives and text filters. This does not imply the combination is unstudied."));
  $("morePapers").disabled=true;return;
 }
 for(const paper of filtered.slice(0,state.visiblePapers)){
  const box=make("article","paper-card");
  const curated=paper.review_status!=="title_inferred_unverified";
  box.append(make("span","evidence-badge"+(curated?"":" machine"),curated?"EDITORIAL CURATION":"TITLE INFERENCE · UNREVIEWED"));
  const h=make("h3","",paper.title);box.append(h);
  box.append(make("div","paper-meta",String(paper.year||"")+" · "+String(paper.venue||"Unspecified")));
  if(paper.authors?.length)box.append(make("p","paper-authors",paper.authors.join(", ")));
  const linkTo=paper.url||paper.source_url||source(paper.source_id)?.url;
  if(linkTo)link(box,"Open paper record",linkTo);
  if(paper.scope_note&&curated)box.append(make("p","paper-authors",paper.scope_note));
  const tags=make("div","paper-matches");
  for(const ref of paper.primitives){
    const other=state.nodeById.get(ref.primitive_id);
    if(!other||state.selected.has(other.id))continue;
    const tag=make("button","paper-match",other.p.name);
    tag.title="Add this primitive to the AND filter";tag.onclick=()=>toggle(other,true);tags.append(tag);
  }
  if(tags.childElementCount)box.append(tags);
  root.append(box);
 }
 $("morePapers").disabled=filtered.length<=state.visiblePapers;
}
function matches(){
 const list=state.nodes.filter(n=>visible(n)&&matchingPrimitive(n)).sort((a,b)=>{
  const q=state.search.toLowerCase().trim();
  if(q){const aa=a.p.name.toLowerCase().startsWith(q)?0:1,bb=b.p.name.toLowerCase().startsWith(q)?0:1;if(aa!==bb)return aa-bb;}
  return a.p.name.localeCompare(b.p.name);
 });
 const root=$("mapMatches");root.replaceChildren();
 for(const n of list.slice(0,65)){
   const b=make("button","match"+(state.selected.has(n.id)?" selected":""),n.p.name);
   b.append(make("small","",n.p.kind+" · "+n.area+(state.selected.has(n.id)?" · SELECTED":"")));
   b.onclick=()=>toggle(n,true);root.append(b);
 }
 if(list.length>65)root.append(make("div","meta-row","+"+(list.length-65)+" more · refine search"));
 if(!list.length)root.append(make("div","meta-row","No matching primitives"));
 draw();
}
function loadEvidence(){
 const all=Graph.mergePapers(state.papersCurated,state.papersHarvested);
 const papers=state.evidence==="curated"?state.papersCurated:state.evidence==="harvested"?state.papersHarvested:all;
 state.graph=Graph.build(papers,new Set(state.nodeById.keys()));
 state.related=Graph.related(state.graph,[...state.selected]);
 state.selectedPapers=Graph.matching(state.graph,[...state.selected]);
 state.visiblePapers=40;
 renderPapers();draw();
}
function zoom(factor,x=state.w/2,y=state.h/2){
 const before=state.scale,after=clamp(before*factor,.13,5),relative=after/before;
 state.panX=x-state.w/2-(x-state.w/2-state.panX)*relative;
 state.panY=y-state.h/2-(y-state.h/2-state.panY)*relative;state.scale=after;draw();
}
stage.addEventListener("pointerdown",e=>{if(e.button!==0)return;stage.setPointerCapture(e.pointerId);state.dragging=true;state.dragged=false;state.lastX=e.clientX;state.lastY=e.clientY;stage.classList.add("dragging");});
stage.addEventListener("pointermove",e=>{
 const b=stage.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
 if(state.dragging){const dx=e.clientX-state.lastX,dy=e.clientY-state.lastY;state.panX+=dx;state.panY+=dy;state.lastX=e.clientX;state.lastY=e.clientY;
  if(Math.abs(dx)+Math.abs(dy)>1)state.dragged=true;draw();return;}
 state.hovered=hit(x,y);const tip=$("hoverTip");tip.hidden=!state.hovered;
 if(state.hovered){tip.textContent=state.hovered.p.name;tip.style.left=clamp(x+14,0,state.w-240)+"px";tip.style.top=clamp(y+12,0,state.h-50)+"px";}draw();
});
stage.addEventListener("pointerup",e=>{const r=stage.getBoundingClientRect();if(state.dragging&&!state.dragged){const n=hit(e.clientX-r.left,e.clientY-r.top);if(n)toggle(n);}state.dragging=false;stage.classList.remove("dragging");});
stage.addEventListener("pointercancel",()=>{state.dragging=false;stage.classList.remove("dragging");});
stage.addEventListener("pointerleave",()=>{state.hovered=null;$("hoverTip").hidden=true;draw();});
stage.addEventListener("wheel",e=>{e.preventDefault();const r=stage.getBoundingClientRect();zoom(e.deltaY>0?.86:1.16,e.clientX-r.left,e.clientY-r.top);},{passive:false});
stage.addEventListener("keydown",e=>{
 if(["+","=","-","0","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Escape"].includes(e.key)){
  e.preventDefault();if(e.key==="Escape")setSelection([]);
  else if(e.key==="0")fit();else if(e.key==="+"||e.key==="=")zoom(1.2);else if(e.key==="-")zoom(.82);
  else{const v=45;state.panX+=e.key==="ArrowLeft"?v:e.key==="ArrowRight"?-v:0;state.panY+=e.key==="ArrowUp"?v:e.key==="ArrowDown"?-v:0;draw();}
 }
});
$("zoomIn").onclick=()=>zoom(1.25);$("zoomOut").onclick=()=>zoom(.8);$("resetView").onclick=fit;
$("motionToggle").onclick=()=>{state.paused=!state.paused;$("motionToggle").textContent=state.paused?"Resume":"Pause";$("motionToggle").setAttribute("aria-pressed",String(state.paused));draw();};
$("clearSelection").onclick=()=>setSelection([]);
$("mapSearch").oninput=e=>{state.search=e.target.value;matches();};
$("mapArea").onchange=e=>{state.area=e.target.value;matches();};
$("mapStatus").onchange=e=>{state.status=e.target.value;matches();};
$("paperEvidence").onchange=e=>{state.evidence=e.target.value;loadEvidence();};
$("paperSearch").oninput=e=>{state.paperSearch=e.target.value;state.visiblePapers=40;renderPapers();};
$("morePapers").onclick=()=>{state.visiblePapers+=40;renderPapers();};
$("exportPapers").onclick=()=>{
 const items=state.selected.size?Graph.matching(state.graph,[...state.selected],state.paperSearch):[];
 const data=JSON.stringify({schema_version:"0.4.0",selected_primitives:[...state.selected],evidence:state.evidence,
  disclaimer:"Bibliographic data with human or unverified title-derived primitive labels; no novelty claim.",items},null,2);
 const blob=new Blob([data],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="tcs-ontology-paper-intersection.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
};
new ResizeObserver(resize).observe(stage);
function animate(t){if(!state.paused&&!state.reduced&&!document.hidden&&t-state.frame>44){state.frame=t;draw(t/1000);}requestAnimationFrame(animate);}
async function fetchData(name,signal,optional=false){
 try{const res=await fetch("./data/"+name+".json",{cache:"no-cache",signal});if(!res.ok)throw Error(name+": HTTP "+res.status);
 const d=await res.json();if(!Array.isArray(d.items))throw Error(name+": malformed items");return d.items;}
 catch(e){if(optional)return [];throw e;}
}
async function init(){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),18000);
 try{
  [state.items,state.papersCurated,state.papersHarvested,state.sources]=await Promise.all([
   fetchData("primitives",abort.signal),fetchData("papers",abort.signal),
   fetchData("papers-harvested",abort.signal,true),fetchData("sources",abort.signal)]);
  state.byId=new Map(state.items.map(p=>[p.id,p]));
  if(state.byId.size!==state.items.length)throw Error("duplicate primitive IDs");
  // The curated corpus is the benchmark source of paper-to-primitive membership.
  setupNodes();
  for(const p of state.papersCurated)for(const ref of p.primitives||[])if(!state.byId.has(ref.primitive_id))throw Error("curated paper has unknown primitive: "+ref.primitive_id);
  loadEvidence();
  const areas=[...new Set(state.items.flatMap(p=>p.areas))].sort();
  for(const area of areas){const op=make("option","",area);op.value=area;$("mapArea").append(op);}
  resize();fit();matches();renderPapers();
  let ids=[];
  if(location.hash.startsWith("#select=")){try{ids=decodeURIComponent(location.hash.slice(8)).split(",");}catch{ids=[];}}
  else if(location.hash){try{ids=[decodeURIComponent(location.hash.slice(1))];}catch{ids=[];}}
  if(ids.length)setSelection(ids,false);
  requestAnimationFrame(animate);
 }catch(e){$("mapError").hidden=false;$("mapError").textContent="Could not load the research graph: "+e.message;console.error(e);}
 finally{clearTimeout(timer);}
}
init();
})();