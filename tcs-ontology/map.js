"use strict";
(()=>{
const $=id=>document.getElementById(id),stage=$("stage"),canvas=$("mapCanvas"),ctx=canvas.getContext("2d");
const state={nodes:[],items:[],papers:[],edges:[],sources:[],byId:new Map(),nodeById:new Map(),centers:new Map(),hovered:null,selected:null,search:"",area:"",status:"all",panX:0,panY:0,scale:1,w:0,h:0,dpr:1,paused:false,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,dragging:false,dragged:false,lastX:0,lastY:0,lastTime:0,frame:0};
const make=(tag,cls="",text="")=>{const x=document.createElement(tag);x.className=cls;x.textContent=text;return x;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const rand=(s,n)=>hash(s+"|"+n)/4294967295;
const hue=s=>150+Math.round(rand(s,3)*140);
const source=id=>state.sources.find(s=>s.id===id);
function link(root,title,url,cls="source"){try{const u=new URL(url);if(u.protocol!=="https:")return;const a=make("a",cls,title+" ↗");a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";root.append(a);}catch{}}
function setupNodes(){
 const areas=[...new Set(state.items.map(p=>p.areas[0]))].sort();
 const groups=new Map(areas.map(a=>[a,[]]));
 for(const p of state.items)groups.get(p.areas[0]).push(p);
 areas.forEach((area,i)=>{const theta=2.3999632297*i,r=105+210*Math.sqrt(i+.4);state.centers.set(area,{x:Math.cos(theta)*r*1.13,y:Math.sin(theta)*r*.87});});
 for(const area of areas){
  const p=groups.get(area).sort((a,b)=>a.id.localeCompare(b.id)),c=state.centers.get(area);
  p.forEach((item,i)=>{const a=2.39996323*i+rand(item.id,4)*.5,r=15+16*Math.sqrt(i);
   const n={id:item.id,p:item,area,x:c.x+Math.cos(a)*r*(.84+rand(item.id,5)*.27),y:c.y+Math.sin(a)*r*(.77+rand(item.id,6)*.20),radius:item.kind==="lens"?6:item.review_status==="source_checked"?3.4:2.4,phase:rand(item.id,7)*6.28,phase2:rand(item.id,8)*6.28};
   state.nodes.push(n);state.nodeById.set(n.id,n);
  });
 }
}
function visible(n){return (!state.area||n.p.areas.includes(state.area))&&(state.status==="all"||n.p.review_status===state.status);}
function pos(n,t=0){const move=state.paused||state.reduced?0:1;return{x:state.w/2+state.panX+(n.x+Math.sin(t*.44+n.phase)*2.4*move)*state.scale,y:state.h/2+state.panY+(n.y+Math.cos(t*.34+n.phase2)*2.2*move)*state.scale};}
function resize(){const b=stage.getBoundingClientRect();state.w=Math.max(100,b.width);state.h=Math.max(100,b.height);state.dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(state.w*state.dpr);canvas.height=Math.round(state.h*state.dpr);ctx.setTransform(state.dpr,0,0,state.dpr,0,0);draw();}
function fit(){if(!state.nodes.length)return;const x=Math.max(...state.nodes.map(n=>Math.abs(n.x)))+65,y=Math.max(...state.nodes.map(n=>Math.abs(n.y)))+65;state.scale=clamp(Math.min((state.w-55)/(2*x),(state.h-55)/(2*y)),.14,2);state.panX=0;state.panY=0;draw();}
function matched(n){const q=state.search.toLowerCase().trim();return !q||[n.p.id,n.p.name,...n.p.aliases].some(s=>s.toLowerCase().includes(q));}
function draw(t=state.lastTime){
 if(!state.nodes.length)return;state.lastTime=t;
 ctx.fillStyle="#0b191d";ctx.fillRect(0,0,state.w,state.h);
 const grid=Math.max(20,57*state.scale);
 ctx.lineWidth=.6;ctx.strokeStyle="rgba(88,143,129,.07)";
 for(let x=(state.w/2+state.panX)%grid;x<state.w;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,state.h);ctx.stroke();}
 for(let y=(state.h/2+state.panY)%grid;y<state.h;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(state.w,y);ctx.stroke();}
 for(const [area,c] of state.centers){if(state.area&&state.area!==area)continue;const x=state.w/2+state.panX+c.x*state.scale,y=state.h/2+state.panY+c.y*state.scale;
  if(x<-300||y<-300||x>state.w+300||y>state.h+300)continue;
  ctx.beginPath();ctx.arc(x,y,80*state.scale+14,0,6.283);
  ctx.lineWidth=1;ctx.strokeStyle="hsla("+hue(area)+",55%,68%,.18)";ctx.stroke();
  ctx.fillStyle="#709b91";ctx.textAlign="center";ctx.font="10px monospace";ctx.fillText(area.toUpperCase().slice(0,28),x,y-80*state.scale-15);
 }
 if(state.selected){
  const ids=new Set(state.edges.filter(e=>e.source===state.selected.id||e.target===state.selected.id).map(e=>e.source===state.selected.id?e.target:e.source));
  for(const p of state.papers)if(p.primitives.some(x=>x.primitive_id===state.selected.id))for(const x of p.primitives)ids.add(x.primitive_id);
  const a=pos(state.selected,t);
  for(const id of ids){if(id===state.selected.id)continue;const n=state.nodeById.get(id);if(!n||!visible(n))continue;const b=pos(n,t);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=1.2;ctx.strokeStyle="rgba(150,239,190,.23)";ctx.stroke();}
 }
 let count=0;
 for(const n of state.nodes){if(!visible(n))continue;const pt=pos(n,t);if(pt.x<-25||pt.x>state.w+25||pt.y<-25||pt.y>state.h+25)continue;count++;
  const highlighted=n===state.selected||n===state.hovered,hit=matched(n);ctx.globalAlpha=state.search&&!hit?.11:state.selected&&!highlighted?.78:1;
  const rad=Math.max(n.p.kind==="lens"?4.5:2.2,n.radius*state.scale*(highlighted?1.6:1));
  if(highlighted||state.search&&hit){ctx.beginPath();ctx.arc(pt.x,pt.y,rad+7,0,6.283);ctx.strokeStyle=highlighted?"#fff0c8":"#73cda9";ctx.lineWidth=highlighted?2:1;ctx.stroke();}
  ctx.beginPath();ctx.arc(pt.x,pt.y,rad,0,6.283);
  ctx.fillStyle=n.p.kind==="lens"?"#f1bc77":n.p.review_status==="source_checked"?"hsl("+hue(n.area)+",64%,70%)":"#527077";ctx.fill();
  if(highlighted||n.p.kind==="lens"||state.search&&hit||state.scale>1.4&&n.p.review_status==="source_checked"){
   ctx.fillStyle=highlighted?"#fff8d9":n.p.kind==="lens"?"#f0d1a5":"#c6e9d8";ctx.textAlign="left";ctx.font=(highlighted?"bold 13":"11")+"px sans-serif";ctx.fillText(n.p.name,pt.x+rad+7,pt.y+3,165);
  }ctx.globalAlpha=1;
 }
 $("mapCounter").textContent=count+" rendered · "+state.nodes.filter(visible).length+" eligible · "+state.nodes.length+" total";
}
function hit(x,y){let out=null,min=16;for(const n of state.nodes){if(!visible(n))continue;const p=pos(n),d=Math.hypot(x-p.x,y-p.y);if(d<Math.max(9,n.radius*state.scale+5)&&d<min){min=d;out=n;}}return out;}
function select(n,center=false){if(!n)return;state.selected=n;if(center){state.panX=-n.x*state.scale;state.panY=-n.y*state.scale;}detail(n);draw();history.replaceState(null,"","#"+encodeURIComponent(n.id));}
function detail(n){
 const root=$("mapDetail");root.replaceChildren();
 root.append(make("div","meta-id",n.id),make("h2","detail-name",n.p.name));
 root.append(make("div","review-state"+(n.p.review_status==="source_checked"?" checked":""),n.p.review_status==="source_checked"?"EDITORIAL SOURCE-CHECKED":"UNREVIEWED CANDIDATE"));
 root.append(make("p","",n.p.definition||"Definition awaiting source review."));
 n.p.areas.forEach(a=>root.append(make("span","badge",a)));
 if(n.p.kind==="lens")root.append(make("span","badge lens","RESEARCH LENS"));
 if(n.p.scope_note){root.append(make("div","subhead","SCOPE"));root.append(make("p","",n.p.scope_note));}
 if(n.p.aliases.length){root.append(make("div","subhead","ALIASES"),make("p","",n.p.aliases.join(" · ")));}
 const papers=state.papers.filter(p=>p.primitives.some(x=>x.primitive_id===n.id)).sort((a,b)=>b.year-a.year);
 root.append(make("div","subhead","INDEXED PAPERS ("+papers.length+")"));
 if(!papers.length)root.append(make("p","","No indexed papers; this does not imply a novel or open problem."));
 for(const paper of papers){const box=make("div","paper"),s=source(paper.source_id);
  if(s)link(box,paper.title,s.url);box.append(make("small","",paper.year+" · "+paper.venue+" · "+(paper.primitives.find(x=>x.primitive_id===n.id)?.role||"mentioned")));
  box.append(make("p","",paper.scope_note));root.append(box);}
 const rel=new Set();
 for(const e of state.edges){if(e.source===n.id)rel.add(e.target);if(e.target===n.id)rel.add(e.source);}
 for(const p of papers)for(const x of p.primitives)if(x.primitive_id!==n.id)rel.add(x.primitive_id);
 root.append(make("div","subhead","CONNECTED PRIMITIVES ("+rel.size+")"));
 for(const id of [...rel].slice(0,32)){const other=state.nodeById.get(id);if(!other)continue;const b=make("button","related",other.p.name);b.onclick=()=>select(other,true);root.append(b);}
 root.append(make("div","subhead","REFERENCES"));for(const id of n.p.source_ids||[]){const s=source(id);if(s)link(root,s.title,s.url);}
 link(root,"Open in explorer","https://wuwenhao2002.github.io/tcs-ontology/#primitive="+encodeURIComponent(n.id),"go-atlas");
}
function matches(){
 const list=state.nodes.filter(n=>visible(n)&&matched(n)).sort((a,b)=>a.p.name.localeCompare(b.p.name));const root=$("mapMatches");root.replaceChildren();
 for(const n of list.slice(0,40)){const b=make("button","match",n.p.name);b.append(make("small","",n.p.kind+" · "+n.area));b.onclick=()=>select(n,true);root.append(b);}
 if(list.length>40)root.append(make("div","meta-row","+"+(list.length-40)+" more results; refine search."));
 if(!list.length)root.append(make("p","", "No matching concepts."));
 $("mapHeading").textContent=state.area||"All concepts";draw();
}
function zoom(factor,x=state.w/2,y=state.h/2){
 const initial=state.scale,target=clamp(initial*factor,.13,5),k=target/initial;
 state.panX=x-state.w/2-(x-state.w/2-state.panX)*k;state.panY=y-state.h/2-(y-state.h/2-state.panY)*k;state.scale=target;draw();
}
stage.addEventListener("pointerdown",e=>{if(e.button!==0)return;stage.setPointerCapture(e.pointerId);state.dragging=true;state.dragged=false;state.lastX=e.clientX;state.lastY=e.clientY;stage.classList.add("dragging");});
stage.addEventListener("pointermove",e=>{const b=stage.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
 if(state.dragging){const dx=e.clientX-state.lastX,dy=e.clientY-state.lastY;state.panX+=dx;state.panY+=dy;state.lastX=e.clientX;state.lastY=e.clientY;if(Math.abs(dx)+Math.abs(dy)>1)state.dragged=true;draw();return;}
 state.hovered=hit(x,y);const tip=$("hoverTip");tip.hidden=!state.hovered;
 if(state.hovered){tip.textContent=state.hovered.p.name;tip.style.left=clamp(x+15,0,state.w-245)+"px";tip.style.top=clamp(y+12,0,state.h-50)+"px";}draw();
});
stage.addEventListener("pointerup",e=>{const r=stage.getBoundingClientRect();if(state.dragging&&!state.dragged){const n=hit(e.clientX-r.left,e.clientY-r.top);if(n)select(n);}state.dragging=false;stage.classList.remove("dragging");});
stage.addEventListener("pointercancel",()=>{state.dragging=false;stage.classList.remove("dragging");});
stage.addEventListener("pointerleave",()=>{state.hovered=null;$("hoverTip").hidden=true;draw();});
stage.addEventListener("wheel",e=>{e.preventDefault();const r=stage.getBoundingClientRect();zoom(e.deltaY>0?.86:1.16,e.clientX-r.left,e.clientY-r.top);},{passive:false});
stage.addEventListener("keydown",e=>{
 if(["+","=","-","0","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){
  e.preventDefault();if(e.key==="0")fit();else if(e.key==="+"||e.key==="=")zoom(1.2);else if(e.key==="-")zoom(.82);
  else{const v=45;state.panX+=e.key==="ArrowLeft"?v:e.key==="ArrowRight"?-v:0;state.panY+=e.key==="ArrowUp"?v:e.key==="ArrowDown"?-v:0;draw();}
 }
});
$("zoomIn").onclick=()=>zoom(1.25);$("zoomOut").onclick=()=>zoom(.8);$("resetView").onclick=fit;
$("motionToggle").onclick=()=>{state.paused=!state.paused;$("motionToggle").textContent=state.paused?"Resume motion":"Pause motion";$("motionToggle").setAttribute("aria-pressed",String(state.paused));draw();};
$("clearSelection").onclick=()=>{state.selected=null;$("mapDetail").replaceChildren(make("div","empty","Select a primitive to inspect it."));draw();};
$("mapSearch").oninput=e=>{state.search=e.target.value;matches();};
$("mapArea").onchange=e=>{state.area=e.target.value;matches();};
$("mapStatus").onchange=e=>{state.status=e.target.value;matches();};
new ResizeObserver(resize).observe(stage);
function animate(t){if(!state.paused&&!state.reduced&&!document.hidden&&t-state.frame>44){state.frame=t;draw(t/1000);}requestAnimationFrame(animate);}
async function fetchData(name,signal){const r=await fetch("./data/"+name+".json",{cache:"no-cache",signal});if(!r.ok)throw Error(name+" HTTP "+r.status);const d=await r.json();if(!Array.isArray(d.items))throw Error(name+" invalid");return d.items;}
async function init(){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
 try{
  [state.items,state.edges,state.papers,state.sources]=await Promise.all(["primitives","relationships","papers","sources"].map(n=>fetchData(n,abort.signal)));
  state.byId=new Map(state.items.map(p=>[p.id,p]));
  if(state.byId.size!==state.items.length)throw Error("Duplicate primitive IDs");
  for(const p of state.papers)for(const e of p.primitives)if(!state.byId.has(e.primitive_id))throw Error("Missing paper primitive "+e.primitive_id);
  setupNodes();
  const areas=[...new Set(state.items.flatMap(p=>p.areas))].sort();
  for(const a of areas){const o=make("option","",a);o.value=a;$("mapArea").append(o);}
  $("metrics").textContent=state.nodes.length+" primitives · "+areas.length+" areas · "+state.papers.length+" papers · "+state.items.filter(p=>p.kind==="lens").length+" research lenses";
  resize();fit();matches();
  if(location.hash){let id="";try{id=decodeURIComponent(location.hash.slice(1));}catch{}const n=state.nodeById.get(id);if(n)select(n,true);}
  requestAnimationFrame(animate);
 }catch(e){$("mapError").hidden=false;$("mapError").textContent="Could not load the primitive map: "+e.message;console.error(e);}
 finally{clearTimeout(timer);}
}
init();
})();