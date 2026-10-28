import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {loadTs} from './test-module.mjs';
const {planModuleImport}=await loadTs('./module-import.ts'),{defaultMechanics}=await loadTs('./mechanics.ts');
const config=defaultMechanics(),before=JSON.stringify(config),list=JSON.parse(readFileSync('public/examples/crusader-maneuvers/all.json','utf8'));
let plan=planModuleImport(JSON.stringify(list),config);assert.equal(plan.rows.length,8);assert.equal(plan.rows.some(r=>r.update),false);assert.equal(JSON.stringify(config),before);
assert.equal(planModuleImport(JSON.stringify(list[0]),config).rows.length,1);assert.equal(planModuleImport(JSON.stringify({modules:list}),config).rows.length,8);assert.equal(planModuleImport('\uFEFF'+JSON.stringify(list),config).rows.length,8);
assert.throws(()=>planModuleImport(JSON.stringify([list[0],list[0]]),config),/重复id/);assert.throws(()=>planModuleImport('[]',config),/1–1000/);assert.throws(()=>planModuleImport('{oops',config),/语法/);
const bad=structuredClone(list);bad[2].outputs=[{target:'not_a_target',duration:'short',bonusType:'unnamed',value:'1'}];assert.throws(()=>planModuleImport(JSON.stringify(bad),config),/第3项/);assert.equal(JSON.stringify(config),before);
const existing={...config,modules:{[list[0].id]:list[0]}};assert.equal(planModuleImport(JSON.stringify(list),existing).rows.filter(r=>r.update).length,1);
const target={id:'target',name:'目标',category:'feat',mode:'passive',parameters:{},outputs:[{target:'damage',value:'modules.source.vars.bonus',duration:'short',bonusType:'unnamed'}]},source={id:'source',name:'来源',category:'feat',mode:'passive',parameters:{},variables:{bonus:'3'},outputs:[]};assert.equal(planModuleImport(JSON.stringify([target,source]),config).rows.length,2);
assert.throws(()=>planModuleImport(JSON.stringify([target]),config),/跨模块引用不存在/);assert.throws(()=>planModuleImport(JSON.stringify([{...list[0],spell:{level:1,classes:['missing']}}]),config),/职业不存在/);
console.log('Batch import: supported formats, BOM, duplicates, indexed errors, forward references, updates and atomic non-mutation passed');

const many=Array.from({length:1000},(_,n)=>({id:`bulk_${n}`,name:`批量${n}`,category:'spell',mode:'toggle',spell:{level:1},parameters:{},outputs:[]}));
assert.equal(planModuleImport(JSON.stringify(many),config).rows.length,1000);
const bigger={...config,modules:Object.fromEntries(Array.from({length:5000},(_,n)=>{const m={...many[0],id:`bulk_${n}`};return [m.id,m]}))};
assert.equal(planModuleImport(JSON.stringify({...many[0],name:'更新已有'}),bigger).rows[0].update,true);
assert.throws(()=>planModuleImport(JSON.stringify({...many[0],id:'one_more'}),bigger),/5000/);
assert.throws(()=>planModuleImport(JSON.stringify([...many,{...many[0],id:'over_batch'}]),config),/1–1000/);
console.log('Expanded limits: 1000-item batch and 5000-item library accepted; limit overflow rejected');
