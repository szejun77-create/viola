import assert from 'node:assert/strict';
import {loadTs} from './test-module.mjs';
const {defaultMechanics}=await loadTs('./mechanics.ts');
const {validateModule,validateCatalog}=await loadTs('./rule-schema.ts');
const {prepareModules}=await loadTs('./rule-engine.ts');
const {prepareShared}=await loadTs('./shared-effects.ts');
const {actionPatch}=await loadTs('./resource-engine.ts');
const {steelHeart}=await loadTs('./rule-types.ts');
const diehard={id:'diehard',name:'顽强',category:'class',description:'生命值负值时，你每回合可以做一个标准动作，并在回合后受到一点伤害。',mode:'passive',parameters:{},outputs:[],notes:[{text:'生命值负值时，你每回合可以做一个标准动作，并在回合后受到一点伤害。',when:'current.hp < 0'}]};
const config=defaultMechanics();config.modules={diehard,steel_heart:steelHeart};validateModule(diehard,{});validateCatalog({modules:config.modules,weaponVariables:{}});
const zero={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0};
const c={hp:5,race:'人类',class_levels:[],strength:10,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10,ability_permanent:zero,ability_temporary:zero,editable_fields:[],rule_state:{instances:[{id:'d',moduleId:'diehard',enabled:false,access:'gm',params:{}},{id:'s',moduleId:'steel_heart',enabled:false,access:'gm',params:{}}],weapon:{},resourceValues:{s:{damage_buffer:8}}}};
for(const hp of [1,0,-1,-10,0,5]){const current={...c,hp};for(const report of [prepareModules(current,config),prepareShared(current,config,[])]){assert.deepEqual(report.errors,{});assert.equal(report.notes.length,hp<0?1:0)}}
const settled=actionPatch(c,config,'s','settle_damage',false);assert.equal(settled.hp,-3);assert.equal(prepareModules({...c,...settled},config).notes.length,1);
const absent={...c};delete absent.hp;assert.match(prepareModules(absent,config).errors.d,/current.hp/);
assert.throws(()=>validateModule({...diehard,id:'**diehard**'},{}),/id/);
console.log('Current-HP notes: negative/zero/positive transitions, both card paths, settlement updates and missing-HP errors passed');
