import assert from 'node:assert/strict';import fs from 'node:fs';import {loadTs} from './test-module.mjs';
const {defaultMechanics}=await loadTs('./mechanics.ts');const {validateModule}=await loadTs('./rule-schema.ts');const {performResourceAction}=await loadTs('./resource-engine.ts');const {prepareModules}=await loadTs('./rule-engine.ts');const {calculateAttackCount}=await loadTs('./calculator.ts');
const modules=JSON.parse(fs.readFileSync(new URL('../public/examples/warblade-maneuvers/all.json',import.meta.url),'utf8')),config=defaultMechanics();config.modules=Object.fromEntries(modules.map(m=>[m.id,m]));config.classes.warblade.baseStats={attack:1};config.classes.warblade.spellSlots={'9':{'1':3}};for(const m of modules)validateModule(m,{},config.modules);
const zero={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0},c={race:'人类',hp:50,class_levels:Array(9).fill('warblade'),strength:18,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10,ability_permanent:zero,ability_temporary:zero,editable_fields:[],rule_state:{weapon:{},instances:modules.map(m=>({id:m.id,moduleId:m.id,enabled:false,access:'gm',params:{}})),spellPreparations:modules.map((m,i)=>({classId:'warblade',slotLevel:1,slotIndex:i,spellInstanceId:m.id}))}};
for(const [index,m]of modules.entries()){
 const cast=performResourceAction(c,config,{event:'cast',instanceId:m.id,actionId:'cast',preparation:{classId:'warblade',slotLevel:1,slotIndex:index}},false),report=prepareModules({...c,...cast},config);assert.deepEqual(report.errors,{});
 if(m.id==='dancing_mongoose'){assert.equal(calculateAttackCount(c.class_levels,config,report.extras.attackCount.long,report.extras.attackCount.short),3)}
 if(m.id==='rabid_wolf_strike'){assert.equal(report.effects.find(e=>e.target==='damageDice').value,6);assert.equal(report.effects.find(e=>e.target==='melee').value,4)}
 if(m.id==='iron_heart_surge')assert.equal(report.effects.every(e=>e.bonusType==='morale'&&e.value===2),true);
 const cleared={...c,...cast,rule_state:{...cast.rule_state,timedEffects:[]}};assert.equal(prepareModules(cleared,config).effects.length,0);
 const expired=performResourceAction({...c,...cast},config,{event:'round',instanceId:'',actionId:''},false);assert.equal(prepareModules({...c,...expired},config).effects.length,0);
}
for(const [bab,count]of [[1,1],[5,1],[6,2],[9,2],[10,2],[11,3],[16,4]])assert.equal(calculateAttackCount(Array(bab).fill('warblade'),config),count);
assert.equal(calculateAttackCount(['cleric'],config),null);
console.log('Warblade JSONs and attack count: confirmed formula, timed activation/deletion/expiry, dice and morale modifiers passed');
