import assert from 'node:assert/strict';
import {loadTs} from './test-module.mjs';
const {defaultMechanics}=await loadTs('./mechanics.ts');
const {prepareModules}=await loadTs('./rule-engine.ts');
const {validateModule}=await loadTs('./rule-schema.ts');
const definition={id:'memo_sample',name:'备忘样例',category:'spell',mode:'toggle',parameters:{},outputs:[],notes:[{text:'旧备忘默认归战斗'},{text:'负面条件提醒',category:'negative',when:'current.hp < 0'},{text:'探索提醒',category:'noncombat'},{text:'战斗提醒',category:'combat'}]};
const config=defaultMechanics();config.modules={memo_sample:definition};validateModule(definition,{});
const zero={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0};
const c={hp:-1,race:'人类',class_levels:[],strength:10,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10,ability_permanent:zero,ability_temporary:zero,editable_fields:[],rule_state:{instances:[{id:'memo',moduleId:'memo_sample',enabled:true,access:'gm',params:{}}],weapon:{}}};
let result=prepareModules(c,config);assert.deepEqual(result.errors,{});assert.deepEqual(result.notes.map(n=>n.category),['combat','negative','noncombat','combat']);assert.equal(result.notes[0].name,'备忘样例');
assert.deepEqual(prepareModules({...c,hp:0},config).notes.map(n=>n.category),['combat','noncombat','combat']);
const off={...c,rule_state:{...c.rule_state,instances:[{...c.rule_state.instances[0],enabled:false}]}};assert.equal(prepareModules(off,config).notes.length,0);
for(const category of ['feat','race','class','item','spell','other']){const changed={...definition,category};config.modules.memo_sample=changed;assert.equal(prepareModules(c,config).notes.length,4)}
assert.throws(()=>validateModule({...definition,notes:[{text:'bad',category:'typo'}]},{}),/备忘分类/);
console.log('Three note categories: legacy default, HP conditions, toggle lifecycle, all module categories and invalid-category rejection passed');
