"use strict";
/* TCS Ontology 0.2: DOM-only rendering (never execute database text as markup). */
(function () {
  const state = { items: [], byId: new Map(), edges: [], rules: [], refs: [], literature: [],
    results: [], redirects: new Map(), selected: null, idea: null, page: 0, view: "explore",
    ready: false, query: "", status: "source_checked", kind: "", area: "", graphDepth: 1 };
  const PAGE = 18, KEY = "tcs-ontology-ideas-v2", $ = id => document.getElementById(id);
  const node = (tag, cls = "", value = "") => { const e = document.createElement(tag); e.className = cls; e.textContent = value; return e; };
  const find = id => state.byId.get(state.redirects.get(id) || id);
  const src = id => state.refs.find(x => x.id === id);
  const fmt = s => String(s || "").replaceAll("_", " ");
  const norm = s => String(s || "").normalize("NFKD").toLocaleLowerCase();
  const canonical = id => (state.redirects.get(id) || id);
  function alertUser(message) { const t = $("toast"); t.textContent = message; t.classList.add("show"); clearTimeout(alertUser.t);
    alertUser.t = setTimeout(() => t.classList.remove("show"), 3200); }
  function message(tag, cls, label) { return node(tag, cls, label); }
  function addLink(box, label, url, cls = "detail-link") {
    let safe; try { safe = new URL(url, window.location.href); } catch { return null; }
    if (safe.protocol !== "https:") return null;
    const a = node("a", cls, label + " ↗"); a.href = safe.href; a.target = "_blank"; a.rel = "noopener noreferrer"; box.append(a); return a;
  }
  function pill(box, title, klass = "") { box.append(node("span", "chip " + klass, title)); }
  function download(filename, data, type = "application/json") {
    const blob = new Blob([data], {type: type + ";charset=utf-8"}); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 600);
  }
  function loadSaved() {
    try {
      const current=localStorage.getItem(KEY);
      if(current !== null) {
        const value=JSON.parse(current);
        return Array.isArray(value) ? value.filter(x=>x && typeof x.title==="string" && x.slots && x.rule_id) : [];
      }
      const legacy=JSON.parse(localStorage.getItem("tcs-ontology-saved") || "[]");
      if (!Array.isArray(legacy)) return [];
      const migrated=legacy.filter(x=>x && typeof x.title==="string" && x.slots && x.rule_id)
        .map(x=>({...x,validation_status:x.validation_status||"legacy_candidate_unverified"}));
      if(migrated.length) localStorage.setItem(KEY,JSON.stringify(migrated));
      return migrated;
    } catch { return []; }
  }
  function persist(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); return true; }
    catch { alertUser("Local storage unavailable: use Export saved JSON."); return false; } }
  function setView(id, scroll = true) {
    state.view = id; document.querySelectorAll(".view").forEach(v => v.classList.toggle("hidden", v.id !== id));
    document.querySelectorAll(".tab").forEach(t => { t.classList.toggle("active", t.dataset.view === id); t.setAttribute("aria-selected", t.dataset.view === id ? "true" : "false"); });
    if (id === "saved") showSaved();
    if (scroll) document.querySelector(".tabs").scrollIntoView({behavior: "smooth", block: "start"});
  }
  function deepLink(id) { const hash = "#primitive=" + encodeURIComponent(id); if (location.hash !== hash) history.replaceState(null, "", hash); }
  function followHash() {
    if (!location.hash.startsWith("#primitive=")) return;
    let id; try { id = decodeURIComponent(location.hash.slice("#primitive=".length)); } catch { return; }
    const x = find(id); if (x) { setView("explore", false); state.selected = x.id; inspect(x); renderCatalog(); }
  }
  function matching(items, text) {
    const tokens = norm(text).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return items;
    return items.map(x => {
      const name = norm(x.name), alias = norm((x.aliases || []).join(" ")), area = norm(x.areas.join(" ")), id = norm(x.id), def = norm(x.definition || "");
      const fields = [name, alias, area, id, def];
      if (!tokens.every(t => fields.some(f => f.includes(t)))) return null;
      let score = 0; for (const t of tokens) { if (name === t) score += 100; else if (name.startsWith(t)) score += 40;
        else if (name.includes(t)) score += 20; else if (alias.includes(t)) score += 18; else if (id.includes(t)) score += 10; else if (area.includes(t)) score += 5; }
      if (x.review_status === "source_checked") score += 3;
      return {x, score};
    }).filter(Boolean).sort((a,b) => b.score-a.score || a.x.name.localeCompare(b.x.name)).map(v => v.x);
  }
  function listed() {
    let items = state.items.filter(x => (!state.kind || x.kind === state.kind)
      && (!state.area || x.areas.includes(state.area))
      && (state.status === "all" || x.review_status === state.status));
    return matching(items, state.query);
  }
  function renderCatalog() {
    if (!state.ready) return;
    const items = listed(), pages = Math.ceil(items.length/PAGE);
    state.page = Math.min(state.page, Math.max(0,pages-1));
    $("resultCount").textContent = items.length + " matching / " + state.items.length + " total";
    $("pageNumber").textContent = pages ? (state.page+1) + " / " + pages : "No results";
    $("prevPage").disabled = state.page === 0; $("nextPage").disabled = state.page >= pages-1;
    const target = $("resultList"); target.replaceChildren();
    const visible = items.slice(state.page*PAGE,(state.page+1)*PAGE);
    if (!visible.length) { const tip = node("div","saved-empty","No matching primitives. Try broadening filters or showing candidates."); target.append(tip); }
    for (const x of visible) {
      const button = node("button","result-item" + (state.selected===x.id ? " selected" : ""));
      button.type = "button"; button.setAttribute("aria-label","Inspect "+x.name);
      const text = node("div"); text.append(node("div","result-title",x.name));
      text.append(node("div","result-desc",x.definition || "Candidate vocabulary entry — definition pending review."));
      const badges = node("div","chips"); pill(badges,fmt(x.kind),"kind");
      pill(badges,x.review_status==="source_checked"?"SOURCE CHECKED":"UNREVIEWED",x.review_status==="source_checked"?"check":"pending");
      text.append(badges); button.append(text,node("span","arrow","↗"));
      button.onclick=()=>{state.selected=x.id;inspect(x);renderCatalog();deepLink(x.id);};
      target.append(button);
    }
  }
  function linkedPrimitive(box, id, suffix="") {
    const p = find(id); if (!p) return;
    const button = node("button","detail-link",p.name + suffix);
    button.type="button"; button.onclick=()=>{state.selected=p.id;inspect(p);renderCatalog();deepLink(p.id);
      if (state.view!=="explore") setView("explore");};
    box.append(button);
  }
  function inspect(p) {
    const box = $("inspector"); box.replaceChildren();
    box.append(node("div","detail-id",p.id),node("h3","detail-title",p.name));
    const desc = node("p","detail-intro",p.definition || "This candidate has not been defined or source-checked. Do not assume its exact mathematical interpretation.");
    box.append(desc);
    const tags=node("div","chips");pill(tags,fmt(p.kind),"kind");
    p.areas.forEach(a=>pill(tags,a));box.append(tags);
    box.append(node("div","review "+(p.review_status==="source_checked"?"review-ok":"review-warn"),
      p.review_status==="source_checked"?"EDITORIAL SOURCE-CHECKED":"UNREVIEWED CANDIDATE"));
    if (p.scope_note) { box.append(node("div","detail-sub","SCOPE & CAVEATS"),node("p","detail-intro",p.scope_note)); }
    if (p.aliases?.length) box.append(node("div","detail-sub","ALIASES"),node("p","detail-intro",p.aliases.join(" · ")));
    const outbound=state.edges.filter(e=>e.source===p.id || e.target===p.id);
    box.append(node("div","detail-sub","RELATIONSHIP NEIGHBORHOOD · "+outbound.length));
    if (outbound.length) {
      const graph=node("div","relation-list");
      outbound.forEach(e=>{const row=node("div","relation-item");
        const outgoing=e.source===p.id;const label=(outgoing?"→ ":"← ")+fmt(e.predicate)+(e.review_status==="source_checked"?" · cited":" · candidate");
        row.append(node("div","relation-label",label));linkedPrimitive(row,outgoing?e.target:e.source);
        if (e.note) row.append(node("div","tiny muted",e.note));graph.append(row);});
      box.append(graph);
    } else box.append(node("p","detail-intro","No manually entered relationships yet."));
    const results=state.results.filter(r=>r.subject_ids.includes(p.id));
    box.append(node("div","detail-sub","SCOPED RESULTS · "+results.length));
    for (const r of results) {
      const entry=node("details","theorem");
      const title=node("summary","",r.title);entry.append(title);
      entry.append(node("p","",r.statement));
      entry.append(node("div","tiny muted","PRECONDITIONS: "+r.assumptions.join(" · ")));
      entry.append(node("p","detail-intro",r.scope_note));
      for(const id of r.source_ids){const s=src(id);if(s)addLink(entry,s.title,s.url);}
      box.append(entry);
    }
    box.append(node("div","detail-sub","PROVENANCE"));
    if (!p.source_ids.length) box.append(node("p","detail-intro","No specific source linked yet. Terminology requires review."));
    else for(const sid of p.source_ids){const s=src(sid);if(s)addLink(box,s.title,s.url);}
    const share=node("button","secondary small","Copy canonical ID");share.style.marginTop="17px";
    share.onclick=()=>copy(p.id);box.append(share);
    const use=node("button","primary","Use in composer ↗");use.style.marginTop="12px";use.onclick=()=>seedComposer(p);
    box.append(use);
  }
  function sourceChecked(x) { return x.review_status==="source_checked"; }
  function slotOptions(slot, selected={}) {
    let items=state.items.filter(p=>(!slot.ids||slot.ids.includes(p.id))
      &&(!slot.kinds||slot.kinds.includes(p.kind))
      &&(!slot.areas||slot.areas.some(a=>p.areas.includes(a))));
    if ($("composerChecked")?.checked) items=items.filter(sourceChecked);
    const rule=state.rules.find(r=>r.id===$("ruleSelect").value);
    const compat=rule?.compatibility;
    if (compat && slot.key===compat.equilibrium_slot) {
      const system=find(selected[compat.system_slot]);
      if (system?.compatible_equilibria?.length) items=items.filter(p=>system.compatible_equilibria.includes(p.id));
      items=items.filter(p=>!(compat.deny||[]).some(d=>d.system===system?.id&&d.equilibrium===p.id));
    }
    if (compat && slot.key==="objective" && compat.objective_by_system_kind) {
      const system=find(selected[compat.system_slot]);
      const allowed=system && compat.objective_by_system_kind[system.kind];
      if (allowed) items=items.filter(p=>allowed.includes(p.id));
    }
    return items.sort((a,b)=>a.name.localeCompare(b.name));
  }
  function currentChoice() {
    const choices={};const rule=state.rules.find(r=>r.id===$("ruleSelect").value);
    if(rule)for(const slot of rule.slots)choices[slot.key]=$("slot-"+slot.key)?.value||"";
    return choices;
  }
  function updateComposer(preserve=false) {
    const rule=state.rules.find(r=>r.id===$("ruleSelect").value);if(!rule)return;
    $("ruleDesc").textContent=rule.description;
    const previous=preserve?currentChoice():{}, root=$("slotControls");root.replaceChildren();
    const chosen={};
    for(const slot of rule.slots){
      const wrapper=node("div","slot-row"),label=node("label","field-label",slot.label.toUpperCase());
      const select=node("select");select.id="slot-"+slot.key;select.setAttribute("aria-label",slot.label);label.htmlFor=select.id;
      let options=slotOptions(slot,chosen);
      if(!options.length){const opt=node("option","","No eligible source-checked entries");opt.value="";select.append(opt);select.disabled=true;}
      else {for (const p of options) {const opt=node("option","",p.name);opt.value=p.id;select.append(opt);}
        if(options.some(p=>p.id===previous[slot.key]))select.value=previous[slot.key];}
      chosen[slot.key]=select.value;
      wrapper.append(label,select);root.append(wrapper);
      select.addEventListener("change",()=>{updateComposer(true);clearIdea();});
    }
    clearIdea();
  }
  function seedComposer(p) {
    setView("compose");
    const rule=state.rules.find(r=>r.slots.some(slot=>slotOptions(slot).some(x=>x.id===p.id)));
    if(!rule){alertUser("No source-checked template slot for this primitive; try toggling candidates.");return;}
    $("ruleSelect").value=rule.id;updateComposer();
    const slot=rule.slots.find(s=>slotOptions(s,currentChoice()).some(x=>x.id===p.id));
    if(slot){$("slot-"+slot.key).value=p.id;updateComposer(true);}
  }
  function clearIdea() {state.idea=null;$("ideaOutput").textContent="Choose a template and combine its typed slots to generate a candidate.";
    $("ideaEvidence").replaceChildren();$("saveIdea").disabled=true;$("copyIdea").disabled=true;}
  function compose() {
    const rule=state.rules.find(x=>x.id===$("ruleSelect").value);if(!rule)return;
    const slots=currentChoice();
    if (rule.slots.some(s=>!find(slots[s.key]))) {alertUser("All slots require a valid primitive.");return;}
    const com=rule.compatibility;const system=find(slots[com?.system_slot]);
    const denied=(com?.deny||[]).find(d=>d.system===system?.id&&d.equilibrium===slots[com.equilibrium_slot]);
    if(denied){alertUser("Blocked: "+denied.reason);return;}
    if(com&&system?.compatible_equilibria?.length&&!system.compatible_equilibria.includes(slots[com.equilibrium_slot])) {
      alertUser("Blocked: equilibrium has not been established as compatible with the selected model.");return;
    }
    const title=rule.template.replace(/\{([^}]+)\}/g,(_,key)=>find(slots[key])?.name||key);
    const checked=Object.values(slots).every(id=>sourceChecked(find(id)));
    const warnings=[rule.risk_note];
    if(!checked) warnings.push("At least one component is still an unreviewed vocabulary candidate.");
    if(rule.id==="equilibrium-efficiency")warnings.push("To become a formal question, specify valuations/latencies, player information, model parameters, equilibrium existence, and benchmark orientation.");
    const evidence=state.literature.filter(e=>e.rule_id===rule.id&&Object.entries(e.slots).every(([k,id])=>id===slots[k]));
    const related=state.results.filter(r=>Object.values(slots).some(id=>r.subject_ids.includes(id)));
    state.idea={title,rule_id:rule.id,slots,validation_status:"syntactic_candidate_not_novelty_checked",warnings,created_at:new Date().toISOString()};
    $("ideaOutput").textContent=title; $("saveIdea").disabled=false;$("copyIdea").disabled=false;
    const dest=$("ideaEvidence");dest.replaceChildren();
    const warning=node("div","evidence");warning.append(node("strong","","FORMALIZATION CHECKLIST"));
    warnings.forEach(w=>warning.append(node("p","","• "+w)));dest.append(warning);
    const refs=node("div","evidence");refs.append(node("strong","","LITERATURE EVIDENCE"));
    if(!evidence.length)refs.append(node("p","","No manually verified exact-tuple coverage. This is unknown, not a novel/open problem."));
    for(const e of evidence){refs.append(node("p","",e.summary));refs.append(node("p","",e.scope_note));
      e.source_ids.forEach(sid=>{const s=src(sid);if(s)addLink(refs,s.title,s.url);});}
    if(related.length){refs.append(node("p","","Related background statements (not exact-tuple results):"));
      related.slice(0,5).forEach(r=>refs.append(node("p","",r.title+" — "+r.scope_note)));}
    dest.append(refs);
  }
  function randomize() {
    const rule=state.rules.find(r=>r.id===$("ruleSelect").value);if(!rule)return;
    updateComposer();
    for (const slot of rule.slots) {
      const options=slotOptions(slot,currentChoice());
      if (!options.length) {alertUser("No eligible choices; allow candidate entries or choose another template.");return;}
      const choice=options[Math.floor(Math.random()*options.length)];
      const select=$("slot-"+slot.key);
      select.value=choice.id;
      updateComposer(true);
    }
    compose();
  }
  function showSaved() {
    const saved=loadSaved(),root=$("savedList");root.replaceChildren();$("savedCount").textContent=saved.length;
    if(!saved.length){root.append(node("div","saved-empty","No saved candidates yet. Generate and bookmark a question in Compose."));return;}
    saved.slice().reverse().forEach((item,i)=>{const row=node("div","saved-item"),left=node("div");left.append(node("strong","",item.title));left.append(node("small","",item.rule_id+" · "+(item.created_at||"date unknown")));
      const actions=node("div","saved-actions");const copyButton=node("button","secondary small","Copy");copyButton.onclick=()=>copy(item.title);
      const remove=node("button","secondary small","Remove ×");remove.onclick=()=>{const actual=loadSaved();actual.splice(actual.length-1-i,1);persist(actual);showSaved();};
      actions.append(copyButton,remove);row.append(left,actions);root.append(row);});
  }
  async function copy(text) {try{await navigator.clipboard.writeText(text);alertUser("Copied.");}catch{alertUser("Clipboard unavailable. Select the text manually.");}}
  function listSources() {
    const root=$("sourceList");root.replaceChildren();
    for(const s of state.refs){const card=node("div","source");card.append(node("div","source-label",fmt(s.type).toUpperCase()));
      const h=node("h3");addLink(h,s.title,s.url,"");card.append(h);
      const total=state.items.filter(p=>p.source_ids.includes(s.id)).length;
      card.append(node("p","",total+" linked primitive(s). A reference is not a claim of formal expert approval."));root.append(card);}
  }
  function fillFilter(select, values, fallback) {
    select.replaceChildren();const all=node("option","",fallback);all.value="";select.append(all);
    values.sort().forEach(value=>{const opt=node("option","",fmt(value));opt.value=value;select.append(opt);});
  }
  function auditSummary() {
    const verified=state.items.filter(sourceChecked).length;
    $("statPrimitives").textContent=state.items.length.toLocaleString();
    $("statFields").textContent=new Set(state.items.flatMap(p=>p.areas)).size;
    $("statRelations").textContent=state.edges.length;
    $("statTemplates").textContent=state.rules.length;
    $("reviewedStat").textContent=verified+" source-checked / "+(state.items.length-verified)+" awaiting review";
    $("sourceSummary").textContent=state.refs.length+" source records · "+state.results.length+" scoped results · "+state.redirects.size+" redirects";
  }
  async function fetchJSON(name, signal) {
    const response=await fetch("./data/"+name+".json",{cache:"no-cache",signal});
    if(!response.ok)throw new Error(name+": HTTP "+response.status);
    const data=await response.json();if(!data||!Array.isArray(data.items))throw new Error(name+": invalid items array");
    return data.items;
  }
  async function init() {
    const names=["primitives","relationships","rules","literature","sources","results","redirects"];
    const abort=new AbortController(), timeout=setTimeout(()=>abort.abort(),15000);
    try{
      const [items,edges,rules,literature,refs,results,redirects]=await Promise.all(names.map(name=>fetchJSON(name,abort.signal)));
      if(!items.length)throw new Error("Empty primitive catalog.");
      if(new Set(items.map(x=>x.id)).size!==items.length)throw new Error("Duplicate primitive IDs; fix data before publishing.");
      const map=new Map(items.map(x=>[x.id,x]));
      for(const e of edges)if(!map.has(e.source)||!map.has(e.target))throw new Error("Dangling relationship in source data.");
      state.items=items;state.byId=map;state.edges=edges;state.rules=rules;state.refs=refs;
      state.results=results;state.literature=literature;state.redirects=new Map(redirects.map(x=>[x.from,x.to]));state.ready=true;
      fillFilter($("kindFilter"),[...new Set(items.map(x=>x.kind))],"All types");
      fillFilter($("areaFilter"),[...new Set(items.flatMap(x=>x.areas))],"All areas");
      fillFilter($("reviewFilter"),["all","source_checked","needs_definition","seeded_definition_unverified"],"All review states");
      $("reviewFilter").value="source_checked";state.status="source_checked";
      $("ruleSelect").replaceChildren();
      for(const r of rules){const op=node("option","",r.title);op.value=r.id;$("ruleSelect").append(op);}
      updateComposer();renderCatalog();listSources();auditSummary();showSaved();followHash();
      $("loadingState").hidden=true;
    }catch(e){const box=$("loadingState");box.hidden=false;box.textContent="Could not load validated ontology data ("+e.message+"). Retry after checking connection, then report persistent errors on GitHub.";
      $("resultCount").textContent="DATA UNAVAILABLE";const b=node("button","secondary small","Retry loading");b.onclick=()=>location.reload();box.append(b);
      console.error("TCS ontology initialization:",e);
    }finally{clearTimeout(timeout);}
  }
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>setView(t.dataset.view));
  $("goComposer").onclick=()=>setView("compose");$("goExplorer").onclick=()=>setView("explore");
  $("search").oninput=e=>{state.query=e.target.value;state.page=0;renderCatalog();};
  $("kindFilter").onchange=e=>{state.kind=e.target.value;state.page=0;renderCatalog();};
  $("areaFilter").onchange=e=>{state.area=e.target.value;state.page=0;renderCatalog();};
  $("reviewFilter").onchange=e=>{state.status=e.target.value;state.page=0;renderCatalog();};
  $("prevPage").onclick=()=>{if(state.page>0){state.page--;renderCatalog();}};
  $("nextPage").onclick=()=>{state.page++;renderCatalog();};
  $("ruleSelect").onchange=()=>updateComposer();
  $("composerChecked").onchange=()=>updateComposer(true);
  $("generateButton").onclick=compose;$("shuffleButton").onclick=randomize;
  $("saveIdea").onclick=()=>{if(!state.idea)return;const saved=loadSaved();
    if(saved.some(x=>x.rule_id===state.idea.rule_id&&JSON.stringify(x.slots)===JSON.stringify(state.idea.slots))){alertUser("Already in your collection.");return;}
    saved.push({...state.idea});if(persist(saved)){showSaved();alertUser("Candidate saved in this browser.");}};
  $("copyIdea").onclick=()=>{if(state.idea)copy(state.idea.title+"\n"+state.idea.warnings.join("\n"));};
  $("downloadIdeas").onclick=()=>download("tcs-ontology-ideas.json",JSON.stringify({schema_version:"0.2.0",warning:"Unverified research ideas, not open problems",items:loadSaved()},null,2));
  $("downloadJson").onclick=()=>download("tcs-ontology-primitives.json",JSON.stringify({schema_version:"0.2.0",filter:{status:state.status,kind:state.kind,area:state.area,search:state.query},items:listed()},null,2));
  $("downloadCsv").onclick=()=>{const columns=["id","name","kind","areas","aliases","definition","scope_note","review_status","source_ids"];
    const quote=v=>'"'+String(Array.isArray(v)?v.join("; "):v??"").replaceAll('"','""')+'"';
    download("tcs-ontology-primitives.csv",columns.join(",")+"\r\n"+listed().map(p=>columns.map(c=>quote(p[c])).join(",")).join("\r\n"),"text/csv");};
  $("helpButton").onclick=()=>$("about").showModal();
  document.addEventListener("keydown",e=>{if(e.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)&&state.view==="explore"){e.preventDefault();$("search").focus();}});
  window.addEventListener("hashchange",followHash);
  init();
})();