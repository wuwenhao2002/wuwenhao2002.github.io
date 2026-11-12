"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=name=>JSON.parse(fs.readFileSync(path.join(root,"data",name+".json"),"utf8")).items;
const G=require("../map-model.js");
const curated=read("papers"),harvested=read("papers-harvested"),primitives=read("primitives");
const canonical=new Set(primitives.map(p=>p.id));
const combined=G.mergePapers(curated,harvested);
const index=G.build(combined,canonical);
test("paper graph merges source layers without repeated bibliographic titles",()=>{
 assert.equal(index.papers.length,combined.length);
 assert.ok(index.papers.length>=150);
 assert.ok(index.papers.length<=curated.length+harvested.length);
 assert.equal(new Set(index.papers.map(p=>G.key(p.title))).size,index.papers.length);
});
test("every paper-to-primitive link resolves to a canonical node",()=>{
 for(const p of index.papers)for(const r of p.primitives)assert.ok(canonical.has(r.primitive_id),p.title+" => "+r.primitive_id);
});
test("one primitive yields all and only its indexed papers",()=>{
 const id="lens.prediction";
 const result=G.intersect(index,[id]);
 assert.ok(result.length>10);
 assert.ok(result.every(i=>index.papers[i].primitives.some(x=>x.primitive_id===id)));
});
test("two selected primitives must appear together in each matching paper",()=>{
 const ids=["lens.prediction","problem.ski-rental"];
 const result=G.intersect(index,ids);
 assert.ok(result.length>0);
 for(const i of result){
   const labels=new Set(index.papers[i].primitives.map(x=>x.primitive_id));
   assert.ok(ids.every(x=>labels.has(x)));
 }
 const all=G.intersect(index,["lens.prediction"]);
 assert.ok(result.length<=all.length);
});
test("a related primitive must co-occur with every currently selected primitive",()=>{
 const selected=["lens.prediction","problem.ski-rental"];
 const neighbors=G.related(index,selected);
 const paperIndices=G.intersect(index,selected);
 for(const id of neighbors.keys()){
  assert.ok(paperIndices.some(i=>index.papers[i].primitives.some(x=>x.primitive_id===id)),"spurious highlight: "+id);
  assert.ok(!selected.includes(id));
 }
});
test("no matching exact co-use yields zero papers and zero highlighted neighbors",()=>{
 const filter=["lens.prediction","graph_class.chordal-graph","model.quantum-circuit-model"];
 assert.deepEqual(G.intersect(index,filter),[]);
 assert.equal(G.related(index,filter).size,0);
});
test("curated paper wins against title-only import of same normalized title",()=>{
 for(const p of curated){
   const match=index.papers.find(q=>G.key(q.title)===G.key(p.title));
   assert.equal(match.id,p.id);
 }
});
