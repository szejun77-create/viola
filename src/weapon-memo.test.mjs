import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {loadTs} from './test-module.mjs';
const {adaptiveWeaponMemo}=await loadTs('./module-effects.ts');const {greatsword}=await loadTs('./equipment.ts');const {defaultMechanics}=await loadTs('./mechanics.ts');const {ruleCatalog,validateModule}=await loadTs('./rule-schema.ts');const {prepareModules,validateRuleStateChange}=await loadTs('./rule-engine.ts');const {weaponAttackRows}=await loadTs('./weapon-damage.ts');
const focus=JSON.parse(readFileSync('public/examples/weapon-focus-greatsword.json','utf8'));validateModule(focus,{});validateModule(adaptiveWeaponMemo,{});
const cfg=defaultMechanics();cfg.classes.crusader.baseStats={attack:1};cfg.modules={sword:{...greatsword,id:'sword',outputs:[],resourceMaxModifiers:[]},focus:{...focus,id:'focus'},memo:{...adaptiveWeaponMemo,id:'memo'},bow:{...greatsword,id:'bow',name:'十字弓',weapon:{...greatsword.weapon,type:'crossbow'},tags:['ranged'],outputs:[],resourceMaxModifiers:[]}};
const zero={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0};const state={instances:[{id:'s',moduleId:'sword',enabled:true,access:'gm',params:{}},{id:'b',moduleId:'bow',enabled:true,access:'gm',params:{}},{id:'f',moduleId:'focus',enabled:true,access:'gm',params:{}},{id:'m',moduleId:'memo',enabled:false,access:'gm',params:{}}],weapon:{},equipment:{weapon:'s'}};
const c={...zero,strength:18,dexterity:14,race:'人类',class_levels:['crusader'],ability_permanent:zero,ability_temporary:zero,editable_fields:[],rule_state:state};
function calc(s){const r=prepareModules({...c,rule_state:s},cfg);assert.deepEqual(r.errors,{});return {r,attack:weaponAttackRows(s,ruleCatalog(cfg),'小型',r.extras,r.character,cfg,r.effects)[0].attack}}
const off=calc(state);assert.equal(off.attack,6);assert.equal(off.r.notes.some(n=>n.name==='适应武器'),false);
const on={...state,instances:state.instances.map(i=>i.id==='m'?{...i,enabled:true}:i)};const enabled=calc(on);assert.equal(enabled.attack,6);assert.equal(enabled.r.notes.find(n=>n.name==='适应武器').text.includes('该武器命中＋1（无名）'),true);
const bow={...on,equipment:{weapon:'b'}};assert.equal(calc(bow).attack,3);assert.equal(calc({...bow,instances:state.instances}).attack,3); // adaptation never transfers +1 to crossbow
assert.throws(()=>validateRuleStateChange(c,cfg,on,false),/GM/);validateRuleStateChange(c,cfg,on,true);
assert.throws(()=>validateModule({...adaptiveWeaponMemo,outputs:[{target:'melee',duration:'long',bonusType:'unnamed',value:'1'}]},{}),/纯备忘/);
assert.throws(()=>validateModule({...focus,weaponRequirement:{type:'greatsword'}},{}),/effectText/);
console.log('Weapon memo: DM-only toggle, copied effect text, native +1 once, no adapted numeric effects, off-switch removal and valid copyable JSON passed');
