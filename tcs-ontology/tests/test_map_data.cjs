"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const data=require("../map-data.js");
const success=items=>async()=>({ok:true,status:200,json:async()=>({items})});
const waitingFetch=(_url,{signal})=>new Promise((_resolve,reject)=>{
  if(signal.aborted)reject(signal.reason);
  else signal.addEventListener("abort",()=>reject(signal.reason),{once:true});
});

test("loads approved data paths with a private abort signal and no-cache policy",async()=>{
  const expected=[{id:"problem.matching"}];let request;
  const items=await data.load("primitives",{nonEmpty:true,fetchImpl:async(url,options)=>{
    request={url,options};return {ok:true,status:200,json:async()=>({items:expected})};
  }});
  assert.deepEqual(items,expected);
  assert.equal(request.url,"./data/primitives.json");
  assert.equal(request.options.cache,"no-cache");
  assert.equal(request.options.signal instanceof AbortSignal,true);
});

test("rejects HTTP and JSON failures instead of returning an empty corpus",async()=>{
  await assert.rejects(data.load("papers",{fetchImpl:async()=>({ok:false,status:503})}),/papers HTTP 503/);
  await assert.rejects(data.load("papers-harvested",{fetchImpl:async()=>({ok:true,json:async()=>{throw new SyntaxError("bad JSON");}})}),SyntaxError);
  for(const invalid of [null,{}, {items:{}}, {items:"not an array"}]){
    await assert.rejects(data.load("sources",{fetchImpl:async()=>({ok:true,json:async()=>invalid})}),/expected an items array/);
  }
});

test("accepts legitimate empty collections unless nonEmpty is required",async()=>{
  assert.deepEqual(await data.load("papers-harvested",{fetchImpl:success([])}),[]);
  await assert.rejects(data.load("primitives",{fetchImpl:success([]),nonEmpty:true}),/Empty primitives data/);
});

test("rejects unsupported basenames and invalid deadlines before fetching",async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;return {ok:true,json:async()=>({items:[]})};};
  for(const name of ["../papers","papers.json","https://example.org/data","redirects",null]){
    await assert.rejects(data.load(name,{fetchImpl}),/Unsupported map data name/);
  }
  for(const timeoutMs of [0,-1,NaN,Infinity]){
    await assert.rejects(data.load("papers",{fetchImpl,timeoutMs}),/timeoutMs/);
  }
  await assert.rejects(data.load("papers",{fetchImpl:null}),/unavailable/);
  assert.equal(calls,0);
});

test("forwards caller cancellation and preserves its reason",async()=>{
  const controller=new AbortController(),reason=new Error("navigation cancelled");
  const pending=data.load("papers",{signal:controller.signal,fetchImpl:waitingFetch});
  controller.abort(reason);
  await assert.rejects(pending,error=>error===reason);
  const falsy=new AbortController();
  const cancelled=data.load("papers",{signal:falsy.signal,fetchImpl:waitingFetch});
  falsy.abort(0);
  await cancelled.then(()=>assert.fail("Expected caller cancellation"),error=>assert.equal(error,0));
});

test("an already aborted caller never starts a fetch",async()=>{
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(data.load("papers",{signal:controller.signal,fetchImpl:()=>{calls++;}}),{name:"AbortError"});
  assert.equal(calls,0);
});

test("times out stalled requests and aborts the fetch",async()=>{
  await assert.rejects(data.load("papers-harvested",{timeoutMs:5,fetchImpl:waitingFetch}),error=>{
    assert.equal(error.name,"TimeoutError");assert.match(error.message,/papers-harvested request timed out/);return true;
  });
});

test("successful loads remove the caller listener and clear the timeout",async()=>{
  const controller=new AbortController();let requestSignal;
  await data.load("sources",{signal:controller.signal,timeoutMs:5,fetchImpl:async(_url,{signal})=>{
    requestSignal=signal;return {ok:true,json:async()=>({items:[]})};
  }});
  controller.abort();
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.equal(requestSignal.aborted,false);
});

test("cleans up after failures and rejects aborts during body parsing",async()=>{
  const controller=new AbortController();let requestSignal;
  await assert.rejects(data.load("papers",{signal:controller.signal,fetchImpl:async(_url,{signal})=>{
    requestSignal=signal;return {ok:false,status:404};
  }}),/HTTP 404/);
  controller.abort();assert.equal(requestSignal.aborted,false);
  const interrupted=new AbortController();
  await assert.rejects(data.load("sources",{signal:interrupted.signal,fetchImpl:async()=>({ok:true,json:async()=>{
    interrupted.abort();return {items:[]};
  }})}),{name:"AbortError"});
});

test("exposes the same loader to a browser global without CommonJS",async()=>{
  const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
  const browser={AbortController,DOMException,setTimeout,clearTimeout};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../map-data.js"),"utf8"),browser);
  assert.equal(typeof browser.TCSMapData.load,"function");
  assert.deepEqual(await browser.TCSMapData.load("papers",{fetchImpl:success([])}),[]);
});
