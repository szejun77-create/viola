import assert from 'node:assert/strict';import {loadTs} from './test-module.mjs';
const {defaultMechanics,validateMechanics}=await loadTs('./mechanics.ts');const {casterPools,loadSpell,firstAvailableSlot,validatePreparations,preparationError}=await loadTs('./spell-preparation.ts');const {validateRuleStateChange,prepareModules}=await loadTs('./rule-engine.ts');const {validateModule}=await loadTs('./rule-schema.ts');
const config=defaultMechanics();config.classes.artificer.spellSlots={'2':{'0':1,'1':2,'2':1}};config.classes.cleric.spellSlots={'1':{'1':1}};
const low={id:'low',name:'低环法术',category:'spell',spell:{level:1,classes:['artificer','cleric']},mode:'toggle',parameters:{},outputs:[]},high={...low,id:'high',name:'高环法术',spell:{level:2,classes:['artificer']}},cantrip={...low,id:'cantrip',spell:{level:0}},legacy={...low,id:'legacy',spell:undefined};config.modules={low,high,cantrip,legacy};assert.equal(validateMechanics(config),true);for(const m of Object.values(config.modules))validateModule(m,{});
const levels=['artificer','cleric','artificer'],state={instances:[{id:'l',moduleId:'low',enabled:false,access:'gm',params:{}},{id:'h',moduleId:'high',enabled:false,access:'gm',params:{}},{id:'c',moduleId:'cantrip',enabled:false,access:'gm',params:{}},{id:'old',moduleId:'legacy',enabled:false,access:'gm',params:{}}],weapon:{}};
assert.deepEqual(casterPools(levels,config).map(p=>[p.classId,p.level]),[['artificer',2],['cleric',1]]);
let next=loadSpell(levels,config,state,{classId:'artificer',slotLevel:1,slotIndex:0,spellInstanceId:'l'});next=loadSpell(levels,config,next,{classId:'artificer',slotLevel:1,slotIndex:1,spellInstanceId:'l'});next=loadSpell(levels,config,next,{classId:'artificer',slotLevel:2,slotIndex:0,spellInstanceId:'l',note:'超魔自行裁决'});validatePreparations(levels,config,next);assert.equal(next.spellPreparations.length,3);assert.equal(state.spellPreparations,undefined);assert.equal(firstAvailableSlot(levels,config,next,'artificer','l'),undefined);assert.equal(firstAvailableSlot(levels,config,next,'artificer','c').slotLevel,0);assert.equal(firstAvailableSlot(levels,config,next,'cleric','l').slotLevel,1);
assert.throws(()=>loadSpell(levels,config,state,{classId:'artificer',slotLevel:1,slotIndex:0,spellInstanceId:'h'}),/低环/);assert.throws(()=>loadSpell(levels,config,state,{classId:'cleric',slotLevel:1,slotIndex:0,spellInstanceId:'h'}),/职业/);assert.throws(()=>loadSpell(levels,config,state,{classId:'artificer',slotLevel:1,slotIndex:2,spellInstanceId:'l'}),/法术位/);assert.throws(()=>loadSpell(levels,config,state,{classId:'artificer',slotLevel:1,slotIndex:0,spellInstanceId:'foreign-id'}),/未分配/);assert.throws(()=>loadSpell(levels,config,state,{classId:'artificer',slotLevel:1,slotIndex:0,spellInstanceId:'old'}),/环级/);
const replaced=loadSpell(levels,config,next,{classId:'artificer',slotLevel:2,slotIndex:0,spellInstanceId:'h'});assert.equal(replaced.spellPreparations.length,3);assert.equal(replaced.spellPreparations.filter(p=>p.spellInstanceId==='h').length,1);
const z={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0},character={...z,race:'人类',class_levels:levels,ability_permanent:z,ability_temporary:z,editable_fields:[],rule_state:state};validateRuleStateChange(character,config,next,false);assert.deepEqual(prepareModules({...character,rule_state:next},config).effects,[]); // loading itself never activates a spell
assert.throws(()=>validatePreparations(levels,config,{...next,spellPreparations:[next.spellPreparations[0],next.spellPreparations[0]]}),/两次/);
const reduced=structuredClone(config);reduced.classes.artificer.spellSlots['2']['1']=1;assert.equal(preparationError(levels,reduced,next,next.spellPreparations[1]).includes('超出'),true);validateRuleStateChange({...character,rule_state:next},reduced,{...next,weapon:{two_handed:true}},true);assert.throws(()=>validateRuleStateChange({...character,rule_state:next},reduced,{...next,spellPreparations:next.spellPreparations.map(p=>({...p,note:'改备注'}))},false),/超出/);
assert.equal(casterPools(['artificer'],config)[0].configured,false);assert.equal(firstAvailableSlot(['artificer'],config,state,'artificer','l'),undefined);
const variant={...low,spell:{level:1,classes:['artificer','cleric'],classLevels:{cleric:2}}};const classSpecific={...config,modules:{...config.modules,low:variant}};assert.equal(firstAvailableSlot(levels,classSpecific,state,'cleric','l'),undefined);
assert.deepEqual(JSON.parse(JSON.stringify(next)).spellPreparations,next.spellPreparations);const bad=structuredClone(config);bad.classes.artificer.spellSlots['2']['1']=-1;assert.equal(validateMechanics(bad),false);assert.throws(()=>validateModule({...low,spell:{level:-1}},{}),/法术资料/);
console.log('Spell preparation: class-level tables, repeats, higher slots, no activation, ownership/class restrictions, capacity/duplicates, exact-level lookup, safe stale records, class-specific rings and persistence passed');

const {canRecoverSpells,recoverSpells}=await loadTs('./spell-preparation.ts');
const spent={...next,spellPreparations:next.spellPreparations.map(p=>({...p,spent:true}))};
assert.equal(canRecoverSpells(config,'artificer'),false);assert.equal(canRecoverSpells(config,'crusader'),true);
assert.throws(()=>recoverSpells(levels,config,spent,'artificer'),/不允许/);
const permitted=structuredClone(config);permitted.classes.artificer.spellRecovery=true;
const mixed={...spent,spellPreparations:[...spent.spellPreparations,{classId:'cleric',slotLevel:1,slotIndex:0,spellInstanceId:'l',spent:true}]};
const recovered=recoverSpells(levels,permitted,mixed,'artificer');assert.equal(recovered.spellPreparations.filter(p=>p.spent).length,1);assert.equal(recovered.spellPreparations.at(-1).classId,'cleric');assert.equal(recovered.spellPreparations[2].note,mixed.spellPreparations[2].note);
validateRuleStateChange({...character,rule_state:mixed},permitted,recovered,false);
assert.throws(()=>validateRuleStateChange({...character,rule_state:mixed},config,recovered,false),/不允许/);
assert.equal(recoverSpells(levels,config,mixed,'artificer',true).spellPreparations[0].spent,false);
console.log('Recovery: per-class permission, mixed classes, retained preparation/notes, GM override and state authorization passed');

const unlimited=structuredClone(config);unlimited.classes.artificer.spellSlots={};
let zeros=state;for(let n=0;n<5;n++){const slot=firstAvailableSlot(levels,unlimited,zeros,'artificer','c');assert.equal(slot.slotLevel,0);zeros=loadSpell(levels,unlimited,zeros,slot)}
assert.equal(zeros.spellPreparations.length,5);validatePreparations(levels,unlimited,zeros);
assert.equal(preparationError(levels,config,state,{classId:'artificer',slotLevel:0,slotIndex:99,spellInstanceId:'c',spent:true}),'');
assert.throws(()=>loadSpell(levels,config,state,{classId:'artificer',slotLevel:0,slotIndex:0,spellInstanceId:'l'}),/低环/);
console.log('Zero-level spells: unlimited capacity without level-row, preserved old entries, higher-level rejection passed');

const {spellLevel,spellCastPlan}=await loadTs('./spell-preparation.ts');
const light={...low,id:'light',name:'光亮术',spell:{level:1,classes:['artificer','cleric','shrine-maiden'],classLevels:{artificer:1,cleric:0,'shrine-maiden':0}}};
assert.equal(spellLevel(light,'artificer'),1);assert.equal(spellLevel(light,'cleric'),0);assert.equal(spellLevel(light,'shrine-maiden'),0);
const lightConfig=structuredClone(config);lightConfig.modules.light=light;lightConfig.classes['shrine-maiden'].spellSlots={'1':{'1':1}};
const lightState={instances:[{id:'light1',moduleId:'light',enabled:false,access:'gm',params:{}}],weapon:{},spellPreparations:[{classId:'shrine-maiden',slotLevel:1,slotIndex:0,spellInstanceId:'light1'}]};
assert.equal(spellCastPlan(['shrine-maiden'],lightConfig,lightState,{classId:'shrine-maiden',spellInstanceId:'light1',heighten:0,metamagic:[],source:{slotLevel:1,slotIndex:0}}).ring,1);
assert.equal(firstAvailableSlot(['shrine-maiden'],lightConfig,lightState,'shrine-maiden','light1').slotLevel,0);
console.log('Light: per-class zero rings preserved, old higher preparation retained, quick-load correctly selects unlimited cantrip slot');
const {spellMatchesClass}=await loadTs('./spell-preparation.ts');
const mappedOnly={...low,spell:{classLevels:{artificer:1,cleric:0,'shrine-maiden':0}}};validateModule(mappedOnly,{});assert.equal(spellLevel(mappedOnly,'cleric'),0);assert.equal(spellLevel(mappedOnly,'warblade'),undefined);assert.equal(spellMatchesClass(mappedOnly,'warblade'),false);
const fallback={...low,spell:{level:2,classes:['cleric']}};assert.equal(spellLevel(fallback,'cleric'),2);assert.equal(spellMatchesClass(fallback,'artificer'),false);
const authoritative={...low,spell:{level:9,classes:['artificer'],classLevels:{cleric:0}}};assert.equal(spellMatchesClass(authoritative,'cleric'),true);assert.equal(spellMatchesClass(authoritative,'artificer'),false);assert.equal(spellLevel(authoritative,'cleric'),0);assert.equal(spellLevel(authoritative,'artificer'),undefined);
const mappedConfig=structuredClone(lightConfig);mappedConfig.modules.light={...light,spell:mappedOnly.spell};const mappedState={...lightState,spellPreparations:[{...lightState.spellPreparations[0],slotLevel:0}]};assert.equal(spellCastPlan(['shrine-maiden'],mappedConfig,mappedState,{classId:'shrine-maiden',spellInstanceId:'light1',heighten:0,metamagic:[],source:{slotLevel:0,slotIndex:0}}).ring,0);
assert.throws(()=>validateModule({...low,spell:{}},{}),/法术资料/);
console.log('Authoritative classLevels: no default required, zero preserved, missing classes excluded, legacy level fallback and mapping-only casting passed');
