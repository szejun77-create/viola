import assert from 'node:assert/strict';import {loadTs} from './test-module.mjs';
const {createRefreshQueue}=await loadTs('./refresh-queue.ts');
let release,started,finish;const began=new Promise(r=>started=r),ended=new Promise(r=>finish=r),calls=[];
const q=createRefreshQueue(async full=>{calls.push(full);if(calls.length===1){started();await new Promise(r=>release=r)}else finish()},0);
q.schedule();q.schedule(true);q.schedule();await began;assert.deepEqual(calls,[true]);q.schedule();q.schedule(true);release();await ended;assert.deepEqual(calls,[true,true]);q.dispose();q.schedule();await new Promise(r=>setTimeout(r,10));assert.equal(calls.length,2);
let canceled=false;const stop=createRefreshQueue(async()=>{canceled=true},0);stop.schedule();stop.dispose();await new Promise(r=>setTimeout(r,10));assert.equal(canceled,false);console.log('Realtime queue: burst coalescing, full-refresh priority, changes during requests and disposal passed');
