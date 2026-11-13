/* Shared map data loading: an unavailable corpus is never an empty corpus. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object" && module.exports)module.exports=api;
  else root.TCSMapData=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const names=new Set(["primitives","papers","papers-harvested","sources"]);

  async function load(name,{fetchImpl=globalThis.fetch,timeoutMs=18000,nonEmpty=false,signal}={}){
    if(!names.has(name))throw new TypeError("Unsupported map data name");
    if(typeof fetchImpl!=="function")throw new TypeError("Data fetching is unavailable");
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new TypeError("timeoutMs must be positive and finite");
    const aborted=()=>signal?.reason===undefined?new DOMException("Data loading aborted","AbortError"):signal.reason;
    if(signal?.aborted)throw aborted();

    const controller=new AbortController();
    const forwardAbort=()=>controller.abort(aborted());
    signal?.addEventListener("abort",forwardAbort,{once:true});
    const timer=setTimeout(()=>controller.abort(new DOMException(name+" request timed out","TimeoutError")),timeoutMs);
    try{
      const response=await fetchImpl("./data/"+name+".json",{cache:"no-cache",signal:controller.signal});
      if(!response?.ok)throw new Error(name+" HTTP "+(response?.status??"unavailable"));
      const data=await response.json();
      if(!data||!Array.isArray(data.items))throw new Error("Invalid "+name+" data: expected an items array");
      if(nonEmpty&&!data.items.length)throw new Error("Empty "+name+" data");
      if(controller.signal.aborted)throw controller.signal.reason;
      return data.items;
    }finally{
      clearTimeout(timer);
      signal?.removeEventListener("abort",forwardAbort);
    }
  }
  return {load};
});
