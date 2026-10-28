import assert from 'node:assert/strict';
import {loadTs} from './test-module.mjs';
const {defaultMechanics}=await loadTs('./mechanics.ts');
const {calculateDerived,effectGroup,calculateAbilities}=await loadTs('./calculator.ts');
const {calculateHp}=await loadTs('./hp.ts');
const zero={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0};
const config=defaultMechanics();
Object.assign(config.classes.crusader,{hpPerLevel:10,primary:'strength',baseStats:{attack:1,fortitude:.5,reflex:.34,will:.34,classSkill:6,crossSkill:4}});
Object.assign(config.classes.warblade,{hpPerLevel:4,primary:'intelligence',baseStats:{attack:.5,fortitude:.34,reflex:.5,will:.5,classSkill:4,crossSkill:2}});
const c={strength:18,dexterity:14,constitution:18,intelligence:16,wisdom:12,charisma:10,ability_permanent:{...zero},ability_temporary:{...zero},class_levels:[...Array(5).fill('crusader'),...Array(3).fill('warblade'),'crusader']};
let r=calculateDerived(c,config).values;
for(const [key,value]of Object.entries({melee:11,ranged:9,fortitude:9,reflex:5,will:4,classSkill:111,crossSkill:78}))assert.equal(r[key].total,value,key);
const effect=(id,value)=>({id,name:id,value,enabled:true});
c.stat_effects={melee:{long:[effect('late-fraction',.6)],short:[]}};
assert.equal(calculateDerived(c,config).values.melee.total,12); // all contributions before final floor
c.stat_effects.melee.long=[effect('penalty',-11.6)];assert.equal(calculateDerived(c,config).values.melee.total,-1);
c.class_levels=['warblade',...c.class_levels.filter((_,i)=>i!==5)];r=calculateDerived(c,config).values;assert.equal(r.fortitude.total,8);assert.equal(r.reflex.total,7);assert.equal(r.will.total,6);assert.equal(r.classSkill.total,102);assert.equal(r.crossSkill.total,72);
c.ability_permanent.strength=2;let legacy=effectGroup(c,'strength');assert.equal(legacy.long[0].value,2);assert.equal(calculateAbilities(c).strength,20);
c.stat_effects.strength={long:[effect('new-long',1.6)],short:[effect('new-short',.6)]};assert.equal(calculateAbilities(c).strength,20); // not 18+old2+new2.2
c.stat_effects.constitution={long:[effect('con',2)],short:[]};assert.equal(calculateHp(72,calculateAbilities(c).constitution,9).total,117);
const fractional=structuredClone(c);fractional.class_levels=Array(50).fill('crusader');fractional.strength=10;fractional.stat_effects={};fractional.ability_permanent={...zero};config.classes.crusader.baseStats.attack=.34;assert.equal(calculateDerived(fractional,config).values.melee.total,17);
config.classes.crusader.primary='';assert.equal(calculateDerived(c,config).values.classSkill.total,null);
console.log('Formula checks passed: multiclass, first-level-only saves, final-only decimal floor, negative floor, skills and source migration');

const firstConfig=defaultMechanics();Object.assign(firstConfig.classes.crusader,{primary:'strength',baseStats:{classSkill:4,crossSkill:6}});
const first={...c,class_levels:['crusader'],stat_effects:{},ability_permanent:{...zero},ability_temporary:{...zero},strength:18,intelligence:16};
let firstResult=calculateDerived(first,firstConfig).values;assert.equal(firstResult.classSkill.total,32);assert.equal(firstResult.crossSkill.total,36);
first.class_levels.push('crusader');firstResult=calculateDerived(first,firstConfig).values;assert.equal(firstResult.classSkill.total,40);assert.equal(firstResult.crossSkill.total,45);
first.stat_effects={classSkill:{long:[effect('feat',2)],short:[]},crossSkill:{long:[effect('feat2',3)],short:[]}};firstResult=calculateDerived(first,firstConfig).values;assert.equal(firstResult.classSkill.total,42);assert.equal(firstResult.crossSkill.total,48);
console.log('First-level x4: both budgets include ability modifiers; later levels and long effects remain normal');

// Temporary scores change checks/attacks but never create or remove training points.
const training=structuredClone(first);training.stat_effects={};
const baseline=calculateDerived(training,firstConfig);
training.ability_temporary.strength=4;training.ability_temporary.intelligence=6;
let changed=calculateDerived(training,firstConfig);
assert.equal(changed.values.classSkill.total,baseline.values.classSkill.total);
assert.equal(changed.values.crossSkill.total,baseline.values.crossSkill.total);
assert.equal(changed.abilities.strength,baseline.abilities.strength+4);
assert.equal(changed.abilities.intelligence,baseline.abilities.intelligence+6);
training.stat_effects={strength:{long:[{...effect('permanent-str',2),bonusType:'enhancement'}],short:[{...effect('temporary-str',6),bonusType:'enhancement'}]},intelligence:{long:[{...effect('permanent-int',2),bonusType:'enhancement'}],short:[{...effect('temporary-int',6),bonusType:'enhancement'}]}};
changed=calculateDerived(training,firstConfig);
assert.equal(changed.abilities.strength,24);
assert.equal(changed.values.classSkill.total,baseline.values.classSkill.total+5);
assert.equal(changed.values.crossSkill.total,baseline.values.crossSkill.total+5);
training.stat_effects.strength.short=[effect('exhausted',-6)];training.stat_effects.intelligence.short=[effect('temporary-drain',-6)];training.condition_ability_set={strength:0,intelligence:0};
changed=calculateDerived(training,firstConfig);
assert.equal(changed.abilities.strength,0);
assert.equal(changed.values.classSkill.total,baseline.values.classSkill.total+5);
assert.equal(changed.values.crossSkill.total,baseline.values.crossSkill.total+5);
console.log('Training budgets exclude temporary bonuses, penalties and condition overrides; long sources stack independently');
