import assert from 'node:assert/strict';
import {loadTs} from './test-module.mjs';
const {shiftDamage,damageStep,weaponDamageSteps,weaponDamageRows,giantWeaponStance,sizeRank}=await loadTs('./weapon-damage.ts');
const {greatsword,upgradeGreatswordModules}=await loadTs('./equipment.ts');
const {prepareModules,validateRuleStateChange}=await loadTs('./rule-engine.ts');
const {defaultMechanics,upgradeMechanicsRecord}=await loadTs('./mechanics.ts');
const {ruleCatalog,validateModule}=await loadTs('./rule-schema.ts');
assert.equal(weaponDamageSteps.length,14);
for(let i=0;i<13;i++){assert.equal(shiftDamage(weaponDamageSteps[i],1),weaponDamageSteps[i+1]);assert.equal(shiftDamage(weaponDamageSteps[i+1],-1),weaponDamageSteps[i])}
for(const [special,standard]of [['2d4','1d8'],['1d12','2d6'],['2d10','3d6']]){assert.equal(damageStep(special),damageStep(standard));assert.equal(shiftDamage(special,0),special);assert.equal(shiftDamage(special,1),shiftDamage(standard,1))}
assert.equal(shiftDamage('1d10',1),'2d6');assert.equal(shiftDamage('1d10',-1),'1d8');assert.equal(sizeRank('大型（长）'),sizeRank('大型（高）'));
assert.throws(()=>shiftDamage('1d1',-1),/超出/);assert.throws(()=>shiftDamage('12d6',1),/超出/);assert.throws(()=>shiftDamage('1d10',.5),/整数/);
const config=defaultMechanics();config.modules={[greatsword.id]:greatsword,giant_weapon_stance:giantWeaponStance};config.races['强心半身人'].size='小型';
const state={instances:[{id:'sword',moduleId:greatsword.id,enabled:true,access:'gm',params:{}},{id:'stance',moduleId:'giant_weapon_stance',enabled:false,access:'gm',params:{}}],weapon:{},equipment:{weapon:'sword'}};
const zero={strength:0,dexterity:0,constitution:0,intelligence:0,wisdom:0,charisma:0};
const c={...zero,hp:10,race:'强心半身人',class_levels:[],ability_permanent:zero,ability_temporary:zero,editable_fields:[],rule_state:state};
let r=prepareModules(c,config);assert.deepEqual(r.errors,{});assert.equal(weaponDamageRows(state,ruleCatalog(config),'小型',r.extras)[0].dice,'2d6'); // passive stance stays active
const noStance={...state,instances:state.instances.filter(i=>i.id!=='stance')};r=prepareModules({...c,rule_state:noStance},config);assert.equal(weaponDamageRows(noStance,ruleCatalog(config),'小型',r.extras)[0].dice,'1d10');
assert.equal(weaponDamageRows(noStance,ruleCatalog(config),'中型',{})[0].dice,'2d6');
const resized={...noStance,sizeAdjustments:{body:1,weapon:1}};validateRuleStateChange(c,config,resized,true);assert.equal(weaponDamageRows(resized,ruleCatalog(config),'小型',{})[0].dice,'2d8');
assert.throws(()=>validateRuleStateChange(c,config,resized,false),/GM/);
assert.equal(weaponDamageRows(noStance,ruleCatalog(config),undefined,{})[0].dice,'—');
assert.equal(weaponDamageRows({...noStance,equipment:{}},ruleCatalog(config),'小型',{}).length,0);
const old={...greatsword,weapon:{...greatsword.weapon,baseDamage:'2d6',sizeDamage:'1d8',damage:'2d6',damageNote:'巨武招式恢复2d6，目前手动记录，不自动查询能力。'}};
assert.equal(upgradeGreatswordModules({[old.id]:old})[old.id].weapon.baseDamage,'1d10');assert.equal(old.weapon.baseDamage,'2d6');
const migrated=upgradeMechanicsRecord({config:{...config,modules:{[old.id]:old}},version:1,id:'campaign'});assert.equal(migrated.config.modules[old.id].weapon.baseDamage,'1d10');
const custom={...old,weapon:{...old.weapon,baseDamage:'1d12'}};assert.equal(upgradeGreatswordModules({[old.id]:custom})[old.id].weapon.baseDamage,'1d12');
validateModule(giantWeaponStance,{});validateModule(greatsword,{});
console.log('Weapon damage: all 14 ranks, aliases, body/effective size, passive modules, manual permissions, limits, unequipping and narrow legacy correction passed');

config.modules.giant_weapon_stance={...giantWeaponStance,mode:'toggle'};
r=prepareModules(c,config);assert.equal(weaponDamageRows(state,ruleCatalog(config),'小型',r.extras)[0].dice,'1d10');
const active={...state,instances:state.instances.map(i=>i.id==='stance'?{...i,enabled:true}:i)};r=prepareModules({...c,rule_state:active},config);assert.equal(weaponDamageRows(active,ruleCatalog(config),'小型',r.extras)[0].dice,'2d6');
console.log('Toggle-based size effects activate and restore correctly');
