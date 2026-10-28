import assert from 'node:assert/strict';
import {loadTs} from './test-module.mjs';
const {conditionDefinitions,resolveConditions,conditionSpeed,validateConditions,conditionCatalog}=await loadTs('./conditions.ts');
const {calculateSkills}=await loadTs('./skill-engine.ts');
const {calculateAbilities}=await loadTs('./calculator.ts');
const {validateMechanics}=await loadTs('./mechanics.ts');
const {defaultMechanics}=await loadTs('./mechanics.ts');
const {prepareModules,ruleContext,validateRuleStateChange}=await loadTs('./rule-engine.ts');
const {calculateDerived}=await loadTs('./calculator.ts');
const {calculateDefenses}=await loadTs('./defenses.ts');
const {validateModule}=await loadTs('./rule-schema.ts');
assert.equal(conditionDefinitions.length,39);assert.equal(new Set(conditionDefinitions.map(c=>c.id)).size,39);
const clarity={id:'battle_clarity',name:'透析战斗',category:'class',mode:'passive',parameters:{},outputs:[{target:'reflex',duration:'long',bonusType:'insight',value:'IF(conditions.flat_footed, 0, MIN(classes.warblade.level, MAX(0, mod.intelligence)))'}]};
validateModule(clarity,{});
const config=defaultMechanics();config.modules={battle_clarity:clarity};config.classes.warblade.baseStats={reflex:.5};
const zero={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0};
const c={hp:10,race:'人类',class_levels:Array(3).fill('warblade'),strength:10,dexterity:26,constitution:10,intelligence:18,wisdom:10,charisma:10,ability_permanent:zero,ability_temporary:zero,editable_fields:[],rule_state:{instances:[{id:'clarity',moduleId:'battle_clarity',enabled:false,access:'gm',params:{}}],weapon:{},defense:{armor:6,shield:0,naturalArmor:0,deflection:0,size:0,dexCap:4}}};
let report=prepareModules(c,config);assert.deepEqual(report.errors,{});assert.equal(calculateDerived(report.character,config).values.reflex.total,14);assert.equal(ruleContext(c,config)['conditions.flat_footed'],false);
const state={...c.rule_state,conditions:{flat_footed:true}};validateRuleStateChange(c,config,state,false);report=prepareModules({...c,rule_state:state},config);assert.deepEqual(report.errors,{});assert.equal(calculateDerived(report.character,config).values.reflex.total,11);assert.equal(report.notes.find(n=>n.instanceId==='condition:flat_footed').category,'negative');
const ordinary=calculateDefenses(c.rule_state,c.dexterity,{}),flat=calculateDefenses(state,c.dexterity,{});assert.deepEqual([ordinary.defense.total,ordinary.touchDefense.total,ordinary.flatDefense.total],[20,14,16]);assert.deepEqual([flat.defense.total,flat.touchDefense.total,flat.flatDefense.total],[16,10,16]);
assert.equal(calculateDefenses(state,6,{}).defense.dex,-2);
assert.throws(()=>validateRuleStateChange(c,config,{...state,conditions:{flat_footed:'true'}},false),/状态格式/);assert.throws(()=>validateRuleStateChange(c,config,{...state,conditions:{typo:true}},false),/状态格式/);
assert.deepEqual(JSON.parse(JSON.stringify(state)).conditions,{flat_footed:true});
assert.equal(prepareModules(c,config).notes.some(n=>n.instanceId==='condition:flat_footed'),false);

function run(conditions,extra={}){return prepareModules({...c,rule_state:{...c.rule_state,conditions,...extra}},config)}
function skills(conditions){return calculateSkills({...c,rule_state:{...c.rule_state,conditions}},config).rows}
validateConditions({});assert.equal(validateMechanics(config),true);
report=run({blinded:true});assert.deepEqual(report.errors,{});
const blindDefense=calculateDefenses({...c.rule_state,conditions:{blinded:true}},calculateAbilities(report.character).dexterity,report.extras,config);
assert.deepEqual([blindDefense.defense.total,blindDefense.touchDefense.total,blindDefense.flatDefense.total],[14,8,14]);
assert.equal(conditionSpeed({conditions:{blinded:true,entangled:true},instances:[],weapon:{}},30,config),15);
assert.equal(conditionSpeed({conditions:{},instances:[],weapon:{}},30,config),30);
assert.equal(conditionSpeed({conditions:{blinded:true},instances:[],weapon:{}},null,config),null);
const normalSkills=skills({}),blindSkills=skills({blinded:true});
for(const row of blindSkills){const base=normalSkills.find(s=>s.id===row.id);assert.equal(row.total-base.total,['strength','dexterity'].includes(row.ability)||row.id==='search'?-4:0)}
assert.deepEqual(blindSkills.find(s=>s.id==='spot').automaticFailure,['目盲']);
assert.deepEqual(skills({deafened:true}).find(s=>s.id==='listen').automaticFailure,['耳聋']);
assert.equal(run({deafened:true}).extras.initiative.short[0].value,-4);
assert.equal(run({deafened:true}).character.hp,c.hp);
for(const id of ['blown_away','knocked_down']){
 const ground=resolveConditions({conditions:{[id]:true}},config),air=resolveConditions({conditions:{[id]:true,fly:true}},config);
 assert.equal(ground.flags.prone,true);assert.equal(air.flags.prone,false);assert.equal(resolveConditions({conditions:{[id]:false,prone:true}},config).flags.prone,true);
 assert.equal(run({[id]:true,fly:true}).notes.some(n=>n.text.includes('后退')),true);
}
for(const id of ['dying','petrified','unconscious']){report=run({[id]:true});assert.equal(calculateAbilities(report.character).dexterity,0);assert.equal(report.character.dexterity,26);assert.equal(report.character.hp,10);assert.equal(ruleContext(report.character,config)['conditions.helpless'],true)}
report=run({paralyzed:true});assert.equal(calculateAbilities(report.character).strength,0);assert.equal(calculateAbilities(report.character).dexterity,0);
report=run({paralyzed:false});assert.equal(calculateAbilities(report.character).strength,10);assert.equal(calculateAbilities(report.character).dexterity,26);
const fatigueState={conditions:{fatigued:true},conditionCounts:{fatigued:2}};
const fatigue=resolveConditions(fatigueState,config);assert.equal(fatigue.flags.fatigued,false);assert.equal(fatigue.flags.exhausted,true);
report=run(fatigueState.conditions,{conditionCounts:fatigueState.conditionCounts});assert.equal(calculateAbilities(report.character).strength,4);assert.equal(calculateAbilities(report.character).dexterity,20);
const once=run({entangled:true}),twice=prepareModules(once.character,config);assert.equal(calculateAbilities(twice.character).dexterity,22);assert.equal(calculateAbilities(c).dexterity,26);
report=run({prone:true});const proneDefense=calculateDefenses({...c.rule_state,conditions:{prone:true}},26,report.extras,config);
assert.deepEqual(proneDefense.defense.scenarios.map(s=>[s.id,s.total]),[['ranged',24],['melee',16]]);
assert.equal(report.character.stat_effects.melee.short[0].value,-4);
for(const id of ['shaken','frightened','panicked','sickened']){report=run({[id]:true});assert.equal(report.character.stat_effects.ranged.short[0].value,-2);assert.equal(report.character.stat_effects.will.short[0].value,-2);assert.equal(!!report.extras.damage,id!=='shaken');assert.equal(skills({[id]:true}).every((r,i)=>r.total===normalSkills[i].total-2),true)}
assert.equal(skills({fascinated:true}).every((r,i)=>r.total===normalSkills[i].total+(r.ability==='wisdom'?-4:0)),true);
assert.equal(resolveConditions({conditions:{turned:true}},config).flags.cowering,true);
assert.equal(run({invisible:true}).notes[0].category,'combat');
assert.equal(run({incorporeal:true}).notes[0].category,'combat');
const custom={id:'custom_test',name:'测试状态',english:'Test',outputs:[{target:'melee',value:3,bonusType:'INSIGHT'}],notes:[{text:'测试备忘',category:'noncombat'}]};
const customConfig={...config,conditions:{custom_test:custom}};assert.equal(validateMechanics(customConfig),true);validateRuleStateChange(c,customConfig,{...state,conditions:{custom_test:true}},false);
assert.equal(prepareModules({...c,rule_state:{...c.rule_state,conditions:{custom_test:true}}},customConfig).character.stat_effects.melee.short[0].value,3);
validateModule({...clarity,outputs:[{...clarity.outputs[0],value:'IF(conditions.custom_test,2,0)'}]}, {}, undefined,conditionCatalog(customConfig));
assert.throws(()=>validateConditions({conditions:{custom_test:{...custom,implies:[{id:'typo'}]}}}),/不存在/);
assert.throws(()=>validateConditions({conditions:{custom_test:{...custom,implies:[{id:'custom_test'}]}}}),/循环/);
assert.throws(()=>validateConditions({conditions:{custom_test:{...custom,notes:[{text:'x',when:'conditions.typo'}]}}}),/不存在/);
assert.throws(()=>validateConditions({conditions:{custom_test:{...custom,outputs:[{target:'melee',value:'2'}]}}}),/输出/);
assert.throws(()=>validateRuleStateChange(c,config,{...state,conditionCounts:{fatigued:-1}},false),/叠加/);
assert.deepEqual(JSON.parse(JSON.stringify(customConfig)).conditions.custom_test,custom);
console.log('36 conditions: numeric effects, skills, qualitative failures, derived sources, flight, fatigue upgrade, zero attributes, speed, defense scenarios, custom JSON and validation passed');

assert.deepEqual(conditionCatalog().filter(c=>c.tags?.includes('active_entry')).map(c=>c.id),['mounted','climb','fly','swim','burrow','charge','mounted_charge']);
assert.deepEqual(conditionCatalog({conditions:{charge:{id:'charge',name:'冲锋',english:'Charge'}}}).find(c=>c.id==='charge').tags,['active_entry']);
assert.deepEqual(conditionCatalog({conditions:{charge:{id:'charge',name:'冲锋',english:'Charge',tags:[]}}}).find(c=>c.id==='charge').tags,[]);
validateConditions({});
