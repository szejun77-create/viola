// Coalesce realtime invalidations and keep one trailing refresh if a change
// arrives while a request is running. A full refresh takes priority.
export function createRefreshQueue(refresh:(full:boolean)=>Promise<void>,delay=150){
 let timer:ReturnType<typeof setTimeout>|undefined,running=false,pending=false,full=false,disposed=false;
 function arm(){if(timer!==undefined)clearTimeout(timer);timer=setTimeout(()=>{timer=undefined;void flush()},delay)}
 async function flush(){if(disposed||running||!pending)return;const requested=full;pending=false;full=false;running=true;try{await refresh(requested)}catch(error){console.error('Realtime refresh failed',error)}finally{running=false;if(pending&&!disposed)arm()}}
 return {schedule(requestFull=false){if(disposed)return;pending=true;full ||= requestFull;arm()},dispose(){disposed=true;pending=false;if(timer!==undefined)clearTimeout(timer)}};
}
