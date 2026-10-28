import assert from 'node:assert/strict';import fs from 'node:fs';import {loadTs} from './test-module.mjs';
const {defaultMechanics}=await loadTs('./mechanics.ts');const {validateModule}=await loadTs('./rule-schema.ts');const {performResourceAction}=await loadTs('./resource-engine.ts');const {prepareModules}=await loadTs('./rule-engine.ts');const {buildEffectContext}=await loadTs('./shared-effects.ts');
const modules=JSON.parse(fs.readFileSync(new URL('../public/examples/crusader-maneuvers/all.json',import.meta.url),'utf8'));const config=defaultMechanics();config.modules=Object.fromEntries(modules.map(m=>[m.id,m]));config.classes.crusader.spellSlots={'9':{'1':8}};for(const m of modules)validateModule(m,{},config.modules);
const zero={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0};const c={ability_permanent:zero,ability_temporary:zero,id:'caster',name:'十字军',race:'人类',hp:50,class_levels:Array(9).fill('crusader'),strength:18,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10,editable_fields:[],rule_state:{weapon:{},instances:modules.map(m=>({id:m.id,moduleId:m.id,enabled:false,access:'gm',params:{}})),spellPreparations:modules.map((m,i)=>({classId:'crusader',slotLevel:1,slotIndex:i,spellInstanceId:m.id}))}};
for(const [index,m]of modules.entries()){
 const request={event:'cast',instanceId:m.id,actionId:'cast',preparation:{classId:'crusader',slotLevel:1,slotIndex:index}};
 assert.throws(()=>performResourceAction(c,config,{instanceId:m.id,actionId:'cast'},false),/法术资源/);
 const cast=performResourceAction(c,config,request,false);assert.equal(cast.rule_state.spellPreparations[index].spent,true);assert.equal(c.rule_state.spellPreparations[index].spent,undefined);assert.equal(cast.rule_state.instances[index].enabled,true);assert.equal(cast.rule_state.timedEffects[0].remaining,1);
 assert.throws(()=>performResourceAction({...c,...cast},config,request,false),/已消耗/);
 for(const timers of [[],cast.rule_state.timedEffects.map(e=>({...e,remaining:0}))]){const stopped={...c,...cast,rule_state:{...cast.rule_state,timedEffects:timers}};assert.equal(prepareModules(stopped,config).effects.length,0);assert.equal(prepareModules(stopped,config).notes.length,0);if(m.grant){const ally={...c,id:'ally',name:'队友',rule_state:{instances:[],weapon:{}}};assert.equal(buildEffectContext([stopped,ally],config).incoming.ally.length,0)}}
 const timerOnly={...c,...cast,rule_state:{...cast.rule_state,instances:cast.rule_state.instances.map(i=>i.id===m.id?{...i,enabled:false}:i)}};assert.deepEqual(prepareModules(timerOnly,config).effects,prepareModules({...c,...cast},config).effects);

 const report=prepareModules({...c,...cast},config);assert.deepEqual(report.errors,{});if(m.id==='bonesplitter')assert.match(report.notes[0].text,/DC 17/);
 if(m.grant){const ally={...c,id:'ally',name:'队友',rule_state:{instances:[],weapon:{}}};assert.equal(buildEffectContext([{...c,...cast},ally],config).incoming.ally[0].outputs[0].value,4)}
 const expired=performResourceAction({...c,...cast},config,{event:'round',instanceId:'',actionId:''},false);assert.equal(expired.rule_state.instances[index].enabled,false);assert.equal(expired.rule_state.timedEffects[0].remaining,0);assert.equal(prepareModules({...c,...expired},config).effects.length,0);
 assert.throws(()=>performResourceAction(c,config,{...request,instanceId:'wrong'},false),/不匹配/);
}
console.log('8 maneuver JSONs: schema, atomic preparation use, duplicate rejection, dynamic DC, ally grants and one-round expiry passed');
