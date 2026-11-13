"use strict";
/* TCS Ontology v0.5 — scientific Canvas atlas. Only real indexed papers define edges. */
(() => {
const $=id=>document.getElementById(id),stage=$("stage"),canvas=$("mapCanvas");
const ctx=canvas.getContext("2d",{alpha:false}),Graph=window.TCSGraphModel;
if(!ctx||!Graph){const e=$("mapError");e.hidden=false;e.textContent="Graph rendering is unavailable in this browser.";return;}
const S={items:[],nodes:[],nodeMap:new Map(),areaCenters:new Map(),areas:[],papersCurated:[],papersHarvested:[],sources:[],paperIndex:Graph.build([]),selected:new Set(),related:new Map(),paperQuery:"",term:"",area:"",review:"all",evidence:"curated",matched:[],hovered:null,focus:true,motion:false,view:{x:0,y:0,scale:1},size:{w:1,h:1,dpr:1},pointer:null,paperLimit:30,needsDraw:true,start:performance.now(),time:0,ready:false};
S.motion=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const el=(tag,cls="",value="")=>{const node=document.createElement(tag);node.className=cls;node.textContent=value;return node;};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const noise=(s,n)=>hash(s+"·"+n)/4294967295;
const clamp=(x,a,b)=>Math.min(Math.max(x,a),b);
const palette=[["#73e9d1","#a1fff0"],["#e3b4ff","#f2d5ff"],["#89b7ff","#cee3ff"],["#f5c48f","#ffdfb2"],["#ff9ea2","#ffd3cd"],["#8ce3b8","#c9ffda"],["#84d9ff","#d0f3ff"]];
const colors=area=>palette[hash(area)%palette.length];
const pName=id=>S.nodeMap.get(id)?.p.name||id;
function paperHref(p){const raw=p.url||p.source_url||S.sources.find(s=>s.id===p.source_id)?.url||"";try{const u=new URL(raw);return u.protocol==="https:"?u.href:null;}catch{return null;}}
function link(parent,text,url,cls="paper-source"){if(!url)return;const a=el("a",cls,text);a.href=url;a.rel="noopener noreferrer";a.target="_blank";parent.append(a);return a;}
function setup(){
 const byArea=new Map();
 for(const p of S.items){const area=p.areas?.[0]||"Other";if(!byArea.has(area))byArea.set(area,[]);byArea.get(area).push(p);}
 S.areas=[...byArea.keys()].sort((a,b)=>a.localeCompare(b));
 const n=S.areas.length,cols=Math.ceil(Math.sqrt(n*1.55)),rows=Math.ceil(n/cols);
 const placements=S.areas.map((name,i)=>{
   const col=i%cols,row=Math.floor(i/cols);
   const x=(col-(cols-1)/2)*255+(row%2)*65;
   const y=(row-(rows-1)/2)*247;
   return {name,x,y,color:colors(name),index:i};
 });
 for(const a of placements)S.areaCenters.set(a.name,a);
 for(const [area,items] of byArea){
  items.sort((a,b)=>a.id.localeCompare(b.id));
  const c=S.areaCenters.get(area);
  for(let i=0;i<items.length;i++){
   const p=items[i],angle=2.39996323*i+noise(p.id,5)*.5,r=18+12.5*Math.sqrt(i);
   const node={id:p.id,p,area,x:c.x+Math.cos(angle)*r*(.9+noise(p.id,9)*.2),y:c.y+Math.sin(angle)*r*(.82+noise(p.id,10)*.3),
    fx:0,fy:0,rank:0,phase:noise(p.id,11)*6.283,phase2:noise(p.id,12)*6.283,c1:c.color[0],c2:c.color[1]};
   S.nodes.push(node);S.nodeMap.set(p.id,node);
  }
 }
}
function allowed(n){return S.selected.has(n.id)||(!S.area||n.p.areas.includes(S.area))&&(S.review==="all"||n.p.review_status===S.review);}
function matchesTerm(n){const q=S.term.trim().toLowerCase();return !q||[n.p.name,n.id,...(n.p.aliases||[])].some(x=>x.toLowerCase().includes(q));}
function clearRelated(){S.related=Graph.related(S.paperIndex,[...S.selected]);S.matched=Graph.matching(S.paperIndex,[...S.selected],S.paperQuery);}
function computeFocus(){
 const selected=[...S.selected].map(id=>S.nodeMap.get(id)).filter(Boolean);
 if(!selected.length)return;
 const len=selected.length;
 selected.forEach((node,i)=>{
  let x=0,y=0;
  if(len>1){const a=-Math.PI/2+i*2*Math.PI/len,r=44+Math.min(len*12,55);x=Math.cos(a)*r;y=Math.sin(a)*r;}
  node.fx=x;node.fy=y;node.rank=1000;
 });
 const others=[...S.related].map(([id,count])=>({node:S.nodeMap.get(id),count}))
   .filter(x=>x.node&&!S.selected.has(x.node.id)).sort((a,b)=>b.count-a.count||a.node.p.name.localeCompare(b.node.p.name));
 // Multi-ring layout, with enough separation to keep first-order neighbors legible.
 let cursor=0;
 for(let ring=0;cursor<others.length;ring++){
  const capacity=10+ring*7;
  const inRing=others.slice(cursor,cursor+capacity);
  const r=165+ring*108;
  inRing.forEach((record,i)=>{
   const a=-Math.PI/2+(i+.25*(ring%2))*2*Math.PI/inRing.length;
   record.node.fx=Math.cos(a)*r;record.node.fy=Math.sin(a)*r*.87;record.node.rank=record.count;
  });
  cursor+=inRing.length;
 }
}
function resetCamera(){
 S.view.x=0;S.view.y=0;
 if(S.selected.size&&S.focus){
  S.view.scale=clamp(Math.min(S.size.w/720,S.size.h/680),.7,1.15);
 } else{
  const maxX=Math.max(...S.nodes.map(n=>Math.abs(n.x)))+150,maxY=Math.max(...S.nodes.map(n=>Math.abs(n.y)))+110;
  S.view.scale=clamp(Math.min((S.size.w-90)/(2*maxX),(S.size.h-90)/(2*maxY)),.18,1.4);
 }
 S.needsDraw=true;
}
function coords(n,t=S.time){
 let x=n.x,y=n.y;
 if(S.selected.size&&S.focus&&(S.selected.has(n.id)||S.related.has(n.id))){x=n.fx;y=n.fy;}
 const drift=S.motion?(S.selected.size&&S.focus?1:2):0;
 x+=Math.sin(t*.33+n.phase)*drift;y+=Math.cos(t*.29+n.phase2)*drift*.7;
 return{x:S.size.w/2+S.view.x+x*S.view.scale,y:S.size.h/2+S.view.y+y*S.view.scale};
}
function sizeToCanvas(){
 const b=stage.getBoundingClientRect();S.size.w=Math.max(100,b.width);S.size.h=Math.max(100,b.height);S.size.dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.floor(S.size.w*S.size.dpr);canvas.height=Math.floor(S.size.h*S.size.dpr);
 canvas.style.width=S.size.w+"px";canvas.style.height=S.size.h+"px";ctx.setTransform(S.size.dpr,0,0,S.size.dpr,0,0);
 if(S.ready)resetCamera();
 S.needsDraw=true;
}
const inside=p=>p.x>-30&&p.x<S.size.w+30&&p.y>-30&&p.y<S.size.h+30;
function background(){
 const {w,h}=S.size;
 ctx.fillStyle="#0a1423";ctx.fillRect(0,0,w,h);
 const nebula=ctx.createRadialGradient(w*.52,h*.48,10,w*.52,h*.48,Math.max(w,h)*.76);
 nebula.addColorStop(0,"#152b40");nebula.addColorStop(.44,"#101e30");nebula.addColorStop(1,"#080f1b");
 ctx.fillStyle=nebula;ctx.fillRect(0,0,w,h);
 // Lightweight deterministic star field, independent of scrolling.
 for(let i=0;i<110;i++){
  const x=noise("star"+i,1)*w,y=noise("star"+i,2)*h,r=.35+noise("star"+i,3)*.9;
  ctx.fillStyle=i%6===0?"rgba(151,228,219,.42)":"rgba(156,184,221,.15)";
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 }
 const vx=S.view.x+w/2,vy=S.view.y+h/2;
 ctx.strokeStyle="rgba(134,172,203,.045)";ctx.lineWidth=.6;
 for(let x=vx%74;x<w;x+=74){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=vy%74;y<h;y+=74){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
}
function areaGalleries(){
 if(S.selected.size&&S.focus)return;
 const {w,h}=S.size;
 for(const a of S.areaCenters.values()){
  if(S.area&&a.name!==S.area)continue;
  const x=w/2+S.view.x+a.x*S.view.scale,y=h/2+S.view.y+a.y*S.view.scale;
  const r=Math.max(23,80*S.view.scale);
  if(x<-190||x>w+190||y<-190||y>h+190)continue;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle="rgba(50,92,111,.075)";ctx.fill();ctx.strokeStyle="rgba(134,193,214,.13)";ctx.lineWidth=.8;ctx.stroke();
  if(S.view.scale>.28){
   const labels={
     "Algorithmic Fairness":"FAIRNESS","Algorithmic Game Theory":"GAME THEORY",
     "Approximation Algorithms":"APPROXIMATION","Complexity Theory":"COMPLEXITY",
     "Computational Geometry":"GEOMETRY","Computational Social Choice":"SOCIAL CHOICE",
     "Cryptography":"CRYPTOGRAPHY","Data Structures":"DATA STRUCTURES",
     "Distributed Computing":"DISTRIBUTED","Fine-Grained Complexity":"FINE-GRAINED",
     "Graph Algorithms":"GRAPH ALGORITHMS","Learning Theory":"LEARNING",
     "Logic and Automata":"AUTOMATA","Mechanism Design":"MECHANISM DESIGN",
     "Online Algorithms":"ONLINE","Property Testing":"PROPERTY TESTING",
     "Quantum Computing":"QUANTUM","Randomized Algorithms":"RANDOMIZED",
     "Scheduling":"SCHEDULING","Streaming Algorithms":"STREAMING",
     "Information Theory":"INFORMATION"
   };
   const short=labels[a.name]||a.name.toUpperCase();
   ctx.fillStyle="rgba(189,224,225,.78)";ctx.textAlign="center";ctx.font="600 10px IBM Plex Mono,monospace";
   ctx.fillText(short,x,y-r-11,110);
  }
 }
}
function focusOrbits(){
 if(!S.selected.size||!S.focus)return;
 const origin={x:S.size.w/2+S.view.x,y:S.size.h/2+S.view.y};
 const n=S.related.size,ringCount=Math.min(7,Math.ceil((n+10)/11));
 ctx.setLineDash([3,8]);ctx.lineWidth=.9;
 for(let i=0;i<ringCount;i++){
  const rx=(165+108*i)*S.view.scale,ry=rx*.87;
  if(rx>S.size.w*1.4&&ry>S.size.h*1.4)break;
  ctx.beginPath();ctx.ellipse(origin.x,origin.y,rx,ry,0,0,Math.PI*2);
  ctx.strokeStyle=i%2?"rgba(95,188,184,.11)":"rgba(127,176,214,.13)";ctx.stroke();
 }
 ctx.setLineDash([]);
 const glow=ctx.createRadialGradient(origin.x,origin.y,8,origin.x,origin.y,180*S.view.scale);
 glow.addColorStop(0,"rgba(255,198,120,.09)");glow.addColorStop(1,"rgba(255,198,120,0)");
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(origin.x,origin.y,Math.max(40,180*S.view.scale),0,Math.PI*2);ctx.fill();
}
function links(t){
 if(!S.selected.size)return;
 const active=[...S.selected].map(id=>S.nodeMap.get(id)).filter(Boolean);
 const neighbors=[...S.related.keys()].map(id=>S.nodeMap.get(id)).filter(n=>n&&allowed(n));
 ctx.save();
 for(const n of neighbors){
  const to=coords(n,t);
  if(!inside(to))continue;
  for(const source of active){
   const from=coords(source,t),midX=(from.x+to.x)/2,midY=(from.y+to.y)/2;
   ctx.beginPath();ctx.moveTo(from.x,from.y);
   ctx.quadraticCurveTo(midX+(to.y-from.y)*.05,midY-(to.x-from.x)*.05,to.x,to.y);
   ctx.strokeStyle="rgba(109,226,199,.17)";ctx.lineWidth=.85;ctx.stroke();
  }
 }
 ctx.restore();
}
function sphere(x,y,r,c1,c2,selected=false,glow=false){
 if(glow){
  const halo=ctx.createRadialGradient(x,y,r*.6,x,y,r*5);
  halo.addColorStop(0,selected?"rgba(255,207,142,.26)":"rgba(110,239,207,.18)");
  halo.addColorStop(1,"rgba(110,239,207,0)");
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*5,0,Math.PI*2);ctx.fill();
 }
 const fill=ctx.createRadialGradient(x-r*.35,y-r*.45,.1,x,y,r*1.12);
 fill.addColorStop(0,c2);fill.addColorStop(.5,c1);fill.addColorStop(1,selected?"#946543":"#254754");
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
 ctx.strokeStyle=selected?"rgba(255,226,173,.84)":"rgba(190,255,244,.46)";
 ctx.lineWidth=selected?1.5:.5;ctx.stroke();
}
function draw(){
 if(!S.ready)return;
 background();areaGalleries();focusOrbits();links(S.time);
 const labelQueue=[];let rendered=0;
 for(const n of S.nodes){
  if(!allowed(n))continue;
  const pt=coords(n,S.time);
  if(!inside(pt))continue;
  rendered++;
  const selected=S.selected.has(n.id),related=S.related.has(n.id),hover=n===S.hovered,searchHit=S.term&&matchesTerm(n);
  const focus=S.selected.size>0&&S.focus;
  if(focus&&!selected&&!related)continue; // Suppress unrelated dots in focus mode only.
  const role=selected?3:related?2:hover?3:n.p.kind==="lens"?1:0;
  const rad=selected?9.8:related?7.3:Math.max(2.4,(n.p.kind==="lens"?5.2:n.p.review_status==="source_checked"?3.4:2.4)*Math.sqrt(S.view.scale));
  ctx.globalAlpha=selected?1:related?1:S.selected.size?.20:searchHit?1:S.term?.14:1;
  if(role>1||hover){sphere(pt.x,pt.y,rad,selected?"#ffc37f":related?"#52e4bf":n.c1,selected?"#fff1bd":related?"#d2fff1":n.c2,selected,true);}
  else{ctx.fillStyle=n.p.kind==="lens"?"#f9c796":n.p.review_status==="source_checked"?n.c1:"#597385";ctx.beginPath();ctx.arc(pt.x,pt.y,rad,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  const shouldLabel=selected||hover||searchHit||related&&focus||n.p.kind==="lens"&&!S.selected.size||S.view.scale>1.18&&n.p.review_status==="source_checked";
  if(shouldLabel)labelQueue.push({x:pt.x+rad+7,y:pt.y-1,text:n.p.name,priority:selected?4:hover?5:related?3:searchHit?3:n.p.kind==="lens"?2:1});
 }
 labelQueue.sort((a,b)=>b.priority-a.priority);
 const occupied=[];
 for(const label of labelQueue){
  const fontSize=label.priority>=4?13:label.priority>=3?11.6:10.5;
  ctx.font=(label.priority>=4?"600 ":"500 ")+fontSize+"px Space Grotesk, sans-serif";
  const width=Math.min(205,ctx.measureText(label.text).width),h=17;
  const rect={x:label.x,y:label.y-11,w:width,h};
  if(label.x+width>S.size.w-7||label.y<9||label.y>S.size.h-10)continue;
  if(occupied.some(x=>rect.x<x.x+x.w+7&&rect.x+rect.w+7>x.x&&rect.y<x.y+x.h+3&&rect.y+rect.h+3>x.y))continue;
  occupied.push(rect);
  if(label.priority>=3){
   ctx.fillStyle="rgba(14,29,42,.74)";ctx.fillRect(rect.x-3,rect.y-3,width+8,h+5);
  }
  ctx.fillStyle=label.priority>=4?"#ffdfaf":label.priority>=3?"#c5fae7":"#a3bdca";
  ctx.textAlign="left";ctx.fillText(label.text,label.x,label.y,205);
  if(occupied.length>65)break;
 }
}
function renderSummary(){
 $("mapCounter").textContent=S.selected.size?"CO-USED / "+S.related.size+" CONCEPTS":"INDEX / "+S.nodes.length+" CONCEPTS";
 $("mapScope").textContent=S.selected.size?(S.selected.size+" SELECTED · "+S.matched.length+" MATCHING PAPERS"):"EXPLORE / FULL FIELD";
}
function hitTest(x,y){
 const prioritized=S.nodes.filter(n=>allowed(n)&&(!S.selected.size||!S.focus||S.selected.has(n.id)||S.related.has(n.id)));
 let best=null,min=18;
 for(const n of prioritized){
  const pt=coords(n);const r=S.selected.has(n.id)?16:S.related.has(n.id)?13:10;
  const d=Math.hypot(pt.x-x,pt.y-y);
  if(d<r&&d<min){best=n;min=d;}
 }
 return best;
}
function update(){
 S.related=Graph.related(S.paperIndex,[...S.selected]);S.matched=Graph.matching(S.paperIndex,[...S.selected],S.paperQuery);
 computeFocus();renderChips();renderPapers();renderIndex();renderSummary();
 $("mapHeading").textContent=S.selected.size?[...S.selected].map(pName).join(" + "):"A universe of research ideas";
 document.querySelectorAll(".lens-chip").forEach(b=>{const on=S.selected.has(b.dataset.primitive);b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on));});
 S.needsDraw=true;
}
function syncView(){
 const hashText=Graph.writeView({...S,selected:[...S.selected]});
 try{history.replaceState(null,"",location.pathname+location.search+hashText);}catch{/* A restricted embed can still browse the graph. */}
}
function restoreView(){
 if(!S.ready)return;
 const view=Graph.readView(location.hash,new Set(S.nodeMap.keys()),new Set(S.items.flatMap(p=>p.areas)));
 for(const key of ["term","paperQuery","area","review","evidence","focus"])S[key]=view[key];
 S.selected=new Set(view.selected);
 $("mapSearch").value=S.term;$("paperSearch").value=S.paperQuery;$("mapArea").value=S.area;
 $("mapStatus").value=S.review;$("paperEvidence").value=S.evidence;
 $("focusMode").setAttribute("aria-pressed",String(S.focus));
 evidenceLayer();resetCamera();
}
function selection(ids,setHash=true,recenter=true){
 const active=document.activeElement,focusId=active?.dataset?.primitiveId;
 const fromIndex=active?.classList.contains("match");
 S.selected=new Set(ids.filter(id=>S.nodeMap.has(id)));
 S.paperLimit=30;update();if(recenter)resetCamera();
 if(focusId){
  const list=fromIndex?$("mapMatches"):$("selectedChips");
  const replacement=[...list.querySelectorAll("button")].find(b=>b.dataset.primitiveId===focusId);
  (replacement||$("mapSearch")).focus({preventScroll:true});
 }
 if(setHash)syncView();
}
function toggle(n){if(!n)return;const ids=[...S.selected],i=ids.indexOf(n.id);if(i>=0)ids.splice(i,1);else ids.push(n.id);selection(ids);}
function renderChips(){
 const root=$("selectedChips");root.replaceChildren();
 if(!S.selected.size){root.append(el("span","empty-chips","Select any primitive to reveal the papers connecting it to others."));return;}
 for(const id of S.selected){const pill=el("button","selected-chip");pill.type="button";pill.dataset.primitiveId=id;pill.append(el("span","",pName(id)),el("span","chip-x","×"));pill.setAttribute("aria-label","Remove "+pName(id));pill.onclick=()=>toggle(S.nodeMap.get(id));root.append(pill);}
}
function renderIndex(){
 if(!S.ready)return;
 const q=S.term.trim().toLowerCase();
 let rows=S.nodes.filter(n=>allowed(n)&&matchesTerm(n));
 rows.sort((a,b)=>{
  const score=n=>(S.selected.has(n.id)?1000:0)+(S.related.get(n.id)||0)*9+(n.p.kind==="lens"?7:0)+(q&&n.p.name.toLowerCase().startsWith(q)?30:0);
  return score(b)-score(a)||a.p.name.localeCompare(b.p.name);
 });
 $("primitiveResultsCount").textContent=rows.length.toLocaleString();
 const root=$("mapMatches");root.replaceChildren();
 if(!rows.length){root.append(el("div","empty-index","No concepts found. Try a broader search."));return;}
 for(const n of rows.slice(0,q?100:60)){
  const button=el("button","match"+(S.selected.has(n.id)?" selected":""));button.type="button";
  button.dataset.primitiveId=n.id;button.setAttribute("aria-pressed",String(S.selected.has(n.id)));
  const glyph=el("span","result-symbol",n.p.kind==="lens"?"✦":n.p.kind==="problem"?"⬡":n.p.kind==="property"?"◇":"·");
  const txt=el("span","result-body");
  txt.append(el("span","result-name",n.p.name),el("small","",n.area+" / "+n.p.kind));
  button.append(glyph,txt);
  const count=S.paperIndex.byPrimitive.get(n.id)?.size||0;
  if(count)button.append(el("span","result-count",String(count)));
  button.onclick=()=>toggle(n);root.append(button);
 }
 if(rows.length>(q?100:60))root.append(el("div","index-overflow","Search to narrow "+(rows.length-(q?100:60))+" additional concepts."));
}
function renderPapers(){
 const root=$("mapDetail");root.replaceChildren();
 if(!S.selected.size){$("paperCount").textContent="—";$("morePapers").disabled=true;
  const empty=el("div","empty-papers"),orb=el("div","empty-planet");orb.append(el("span","","✳"));
  empty.append(orb,el("h3","","Find your connection."),el("p","","Choose a concept in the map. Add another to see papers that combine them."));root.append(empty);return;
 }
 const papers=S.matched;
 $("paperCount").textContent=papers.length.toLocaleString();$("morePapers").disabled=papers.length<=S.paperLimit;
 if(!papers.length){const empty=el("div","empty-papers"),orb=el("div","empty-planet");orb.append(el("span","","◌"));
  empty.append(orb,el("h3","","No indexed intersection."),el("p","","Try removing a filter or including title-derived candidates. No match does not mean no published research."));root.append(empty);return;}
 for(const paper of papers.slice(0,S.paperLimit)){
  const box=el("article","paper-card");
  const manual=paper.review_status!=="title_inferred_unverified";
  box.append(el("span","evidence-badge"+(manual?"":" machine"),manual?"EDITORIAL MAPPING":"TITLE-INFERRED · UNREVIEWED"));
  const title=el("h3"),url=paperHref(paper);
  if(url)link(title,paper.title,url,"paper-title-link");else title.textContent=paper.title;
  box.append(title);
  box.append(el("div","paper-meta",String(paper.year||"Undated")+"   /   "+String(paper.venue||"Unspecified")));
  if(paper.authors?.length)box.append(el("div","paper-authors",paper.authors.slice(0,8).join(", ")+(paper.authors.length>8?" et al.":"")));
  const roleList=el("div","paper-matches");
  for(const entry of paper.primitives){
   const n=S.nodeMap.get(entry.primitive_id);
   if(!n||S.selected.has(n.id))continue;
   const button=el("button","paper-match",n.p.name+"  +");button.type="button";button.title="Include "+n.p.name+" in paper intersection";
   button.dataset.primitiveId=n.id;
   button.onclick=()=>toggle(n);roleList.append(button);
  }
  if(roleList.childElementCount)box.append(roleList);
  if(url)link(box,"VIEW SOURCE ↗",url,"paper-source");
  root.append(box);
 }
}
function evidenceLayer(){
 const all=Graph.mergePapers(S.papersCurated,S.papersHarvested);
 const selected=S.evidence==="curated"?S.papersCurated:S.evidence==="harvested"?S.papersHarvested:all;
 S.paperIndex=Graph.build(selected,new Set(S.nodes.map(n=>n.id)));
 S.paperLimit=30;update();if(S.selected.size&&S.focus)resetCamera();
}
function zoomAt(factor,x=S.size.w/2,y=S.size.h/2){
 const k=clamp(S.view.scale*factor,.13,4.4)/S.view.scale;
 S.view.x=x-S.size.w/2-(x-S.size.w/2-S.view.x)*k;
 S.view.y=y-S.size.h/2-(y-S.size.h/2-S.view.y)*k;S.view.scale*=k;S.needsDraw=true;
}
function renderMotionControl(){
 const button=$("motionToggle");
 button.textContent=S.motion?"Ⅱ":"▶";
 button.setAttribute("aria-pressed",String(!S.motion));
 button.setAttribute("aria-label",S.motion?"Pause motion":"Resume motion");
}
stage.addEventListener("pointerdown",e=>{if(e.button!==0)return;stage.setPointerCapture(e.pointerId);S.pointer={x:e.clientX,y:e.clientY,dragged:false};stage.classList.add("dragging");});
stage.addEventListener("pointermove",e=>{
 const rect=stage.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
 if(S.pointer){const dx=e.clientX-S.pointer.x,dy=e.clientY-S.pointer.y;S.pointer.x=e.clientX;S.pointer.y=e.clientY;if(Math.abs(dx)+Math.abs(dy)>2)S.pointer.dragged=true;S.view.x+=dx;S.view.y+=dy;S.needsDraw=true;return;}
 const n=hitTest(x,y);S.hovered=n;
 const tip=$("hoverTip");tip.hidden=!n;
 if(n){tip.replaceChildren(el("span","tip-heading",n.p.name),el("span","tip-meta",n.area+" / "+n.p.kind));
  const count=S.paperIndex.byPrimitive.get(n.id)?.size||0;
  tip.append(el("span","tip-hint",S.selected.has(n.id)?"Click to remove":count+" indexed papers · Click to add"));
  const right=Math.min(S.size.w-290,Math.max(14,x+18));
  tip.style.left=right+"px";tip.style.top=clamp(y-18,15,S.size.h-125)+"px";
 }
 S.needsDraw=true;
});
stage.addEventListener("pointerup",e=>{
 if(!S.pointer)return;const rect=stage.getBoundingClientRect();
 if(!S.pointer.dragged){const hit=hitTest(e.clientX-rect.left,e.clientY-rect.top);if(hit)toggle(hit);}
 S.pointer=null;stage.classList.remove("dragging");S.needsDraw=true;
});
stage.addEventListener("pointercancel",()=>{S.pointer=null;stage.classList.remove("dragging");});
stage.addEventListener("pointerleave",()=>{S.hovered=null;$("hoverTip").hidden=true;S.needsDraw=true;});
stage.addEventListener("wheel",e=>{e.preventDefault();const rect=stage.getBoundingClientRect();zoomAt(e.deltaY>0?.88:1.14,e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
stage.addEventListener("keydown",e=>{
 if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","0","+","=","-","Escape"].includes(e.key))return;
 e.preventDefault();
 if(e.key==="Escape")selection([]);
 else if(e.key==="0")resetCamera();
 else if(e.key==="+"||e.key==="=")zoomAt(1.2);
 else if(e.key==="-")zoomAt(.82);
 else{const step=48;S.view.x+=e.key==="ArrowLeft"?step:e.key==="ArrowRight"?-step:0;S.view.y+=e.key==="ArrowUp"?step:e.key==="ArrowDown"?-step:0;S.needsDraw=true;}
});
$("zoomIn").onclick=()=>zoomAt(1.22);
$("zoomOut").onclick=()=>zoomAt(.82);
$("resetView").onclick=resetCamera;
$("focusMode").onclick=()=>{S.focus=!S.focus;$("focusMode").setAttribute("aria-pressed",String(S.focus));resetCamera();syncView();};
$("motionToggle").onclick=()=>{S.motion=!S.motion;renderMotionControl();S.needsDraw=true;};
$("clearSelection").onclick=()=>selection([]);
$("mapSearch").oninput=e=>{S.term=e.target.value;renderIndex();S.needsDraw=true;syncView();};
$("mapArea").onchange=e=>{S.area=e.target.value;renderIndex();S.needsDraw=true;syncView();};
$("mapStatus").onchange=e=>{S.review=e.target.value;renderIndex();S.needsDraw=true;syncView();};
$("paperEvidence").onchange=e=>{S.evidence=e.target.value;evidenceLayer();syncView();};
$("paperSearch").oninput=e=>{S.paperQuery=e.target.value;S.paperLimit=30;S.matched=Graph.matching(S.paperIndex,[...S.selected],S.paperQuery);renderPapers();renderSummary();S.needsDraw=true;syncView();};
$("morePapers").onclick=()=>{S.paperLimit+=30;renderPapers();};
$("exportPapers").onclick=()=>{
 const papers=S.selected.size?S.matched:[];
 const data=JSON.stringify({schema_version:"0.5.0",selected_primitives:[...S.selected],evidence:S.evidence,items:papers,warning:"Editorially mapped or title-inferred bibliographic labels; not independently peer-reviewed."},null,2);
 const file=new Blob([data],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(file),a=document.createElement("a");
 a.href=url;a.download="tcs-ontology-paper-graph.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),600);
};
document.querySelectorAll("[data-primitive]").forEach(button=>button.onclick=()=>{
 const n=S.nodeMap.get(button.dataset.primitive);if(n)toggle(n);
});
document.addEventListener("keydown",e=>{
 const tag=document.activeElement?.tagName;
 if(e.key==="/"&&tag!=="INPUT"&&tag!=="TEXTAREA"&&tag!=="SELECT"){e.preventDefault();$("mapSearch").focus();}
});
window.addEventListener("hashchange",restoreView);
window.addEventListener("popstate",restoreView);
let resizeObserver=new ResizeObserver(sizeToCanvas);resizeObserver.observe(stage);
function animate(now){
 S.time=(now-S.start)/1000;
 if(!document.hidden&&(S.needsDraw||S.motion)){draw();S.needsDraw=false;}
 requestAnimationFrame(animate);
}
async function json(name,signal,optional=false){
 try{const r=await fetch("./data/"+name+".json",{cache:"no-cache",signal});if(!r.ok)throw Error(name+" HTTP "+r.status);
  const data=await r.json();if(!Array.isArray(data.items))throw Error("Invalid "+name+" data");return data.items;
 }catch(error){if(optional)return [];throw error;}
}
async function init(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
 try{
  [S.items,S.papersCurated,S.papersHarvested,S.sources]=await Promise.all([
   json("primitives",controller.signal),json("papers",controller.signal),json("papers-harvested",controller.signal,true),json("sources",controller.signal)
  ]);
  setup();S.ready=true;
  for(const area of [...new Set(S.items.flatMap(p=>p.areas))].sort()){const op=el("option","",area);op.value=area;$("mapArea").append(op);}
  sizeToCanvas();
  restoreView();
  renderMotionControl();

  requestAnimationFrame(animate);
 }catch(error){const m=$("mapError");m.hidden=false;m.textContent="Could not initialize research atlas: "+error.message;console.error(error);}
 finally{clearTimeout(timer);}
}
init();
})();
