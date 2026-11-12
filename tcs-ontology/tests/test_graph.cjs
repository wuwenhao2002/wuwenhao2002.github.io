"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const model=require("../map-model.js");
const papers=[
 {id:"one",title:"Prediction for Matching",year:2026,venue:"A",authors:[],primitives:[{primitive_id:"lens.prediction"},{primitive_id:"problem.matching"},{primitive_id:"property.regret"}]},
 {id:"two",title:"Prediction for Graph Cut",year:2025,venue:"B",authors:[],primitives:[{primitive_id:"lens.prediction"},{primitive_id:"problem.cut"}]},
 {id:"three",title:"Private Matching",year:2024,venue:"C",authors:[],primitives:[{primitive_id:"lens.privacy"},{primitive_id:"problem.matching"}]}
];
const i=model.build(papers);
test("AND filtering retains only papers containing all selected primitives",()=>{
 assert.deepEqual(model.intersect(i,["lens.prediction"]).map(x=>i.papers[x].id),["one","two"]);
 assert.deepEqual(model.intersect(i,["lens.prediction","problem.matching"]).map(x=>i.papers[x].id),["one"]);
 assert.deepEqual(model.intersect(i,["lens.prediction","lens.privacy"]),[]);
 assert.deepEqual(model.intersect(i,["lens.prediction","lens.prediction"]),model.intersect(i,["lens.prediction"]));
});
test("related primitives are defined only by matching papers",()=>{
 assert.deepEqual([...model.related(i,["lens.prediction"]).keys()].sort(),["problem.cut","problem.matching","property.regret"]);
 assert.deepEqual([...model.related(i,["lens.prediction","problem.matching"]).keys()],["property.regret"]);
 assert.equal(model.related(i,["lens.prediction","lens.privacy"]).size,0);
 assert.equal(model.related(i,[]).size,0);
});
test("duplicate bibliographic title prefers curated record",()=>{
 const duplicate={...papers[0],id:"duplicate",title:"  Prediction -- for Matching! "};
 const all=model.mergePapers([papers[0]],[duplicate,papers[1]]);
 assert.equal(all.length,2);
 assert.equal(all[0].id,"one");
});
test("unknown primitive references excluded when whitelist supplied",()=>{
 const ix=model.build(papers,new Set(["lens.prediction","problem.cut"]));
 assert.equal(ix.byPrimitive.has("problem.matching"),false);
 assert.deepEqual(model.intersect(ix,["lens.prediction","problem.cut"]),[1]);
});
test("year ordering and text search apply after intersection",()=>{
 assert.deepEqual(model.matching(i,["lens.prediction"]).map(p=>p.id),["one","two"]);
 assert.deepEqual(model.matching(i,["lens.prediction"],"Graph Cut").map(p=>p.id),["two"]);
});
