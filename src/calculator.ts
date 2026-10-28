import {type AbilityKey,type Adjustments} from './character-model';
import {type Mechanics} from './mechanics';
import {type HpEffect} from './hp';
import {stackGroups} from './bonuses';
import {sumNumbers,product,floorTotal} from './decimal';
export const abilityKeys:AbilityKey[]=['strength','dexterity','constitution','intelligence','wisdom','charisma'];
export const derivedFields=[['melee','近战命中'],['ranged','远程命中'],['fortitude','强韧'],['reflex','反射'],['will','意志'],['classSkill','本职技能点'],['crossSkill','跨职技能点']] as const;
export type DerivedKey=typeof derivedFields[number][0];
export type StatKey=AbilityKey|DerivedKey;
export interface EffectGroup {long:HpEffect[];short:HpEffect[]}
export interface EffectCharacter {natural_class_levels?:string[];training_character?:EffectCharacter;condition_ability_set?:Partial<Adjustments>;class_levels:string[];ability_permanent:Adjustments;ability_temporary:Adjustments;stat_effects?:Partial<Record<StatKey,EffectGroup>>;strength:number;dexterity:number;constitution:number;intelligence:number;wisdom:number;charisma:number}
export function skillOnly(key:string){return key==='classSkill'||key==='crossSkill'}
export function effectGroup(c:EffectCharacter,key:StatKey):EffectGroup{
 if(c.stat_effects?.[key])return c.stat_effects[key]!;
 if(abilityKeys.includes(key as AbilityKey)){const k=key as AbilityKey;const legacy=(value:number,side:string,name:string):HpEffect[]=>value?[{id:`legacy-${k}-${side}`,name,value,enabled:true}]:[];return {long:legacy(c.ability_permanent[k],'long','原永久调整'),short:legacy(c.ability_temporary[k],'short','原临时调整')}}
 return {long:[],short:[]};
}
export function calculateAbilities(c:EffectCharacter){return Object.fromEntries(abilityKeys.map(k=>{const g=effectGroup(c,k);return [k,c.condition_ability_set?.[k]??floorTotal(c[k],stackGroups(g.long,g.short).total)]})) as Adjustments}
// Training budgets use innate scores plus long-term sources only, independently stacked.
export function calculateSkillPointAbilities(c:EffectCharacter){return Object.fromEntries(abilityKeys.map(k=>[k,floorTotal(c[k],stackGroups(effectGroup(c,k).long,[]).total)])) as Adjustments}
export function calculateDerived(c:EffectCharacter,config:Mechanics){
 const abilities=calculateAbilities(c),skillPointAbilities=calculateSkillPointAbilities(c);const pointModifier=(key:AbilityKey)=>Math.floor((skillPointAbilities[key]-10)/2);const modifier=(key:AbilityKey)=>Math.floor((abilities[key]-10)/2);
 const counts=new Map<string,number>();c.class_levels.forEach(id=>counts.set(id,(counts.get(id)||0)+1));
 const values=Object.fromEntries(derivedFields.map(([key])=>{
  const parts:{label:string;value:number}[]=[],missing:string[]=[];if(!counts.size&&!c.natural_class_levels?.length)missing.push('尚未分配职业等级');
  const rateKey=key==='melee'||key==='ranged'?'attack':key;
  for(const[id,level]of counts){const rule=config.classes[id],rate=rule?.baseStats?.[rateKey];if(rate==null){missing.push(`${rule?.name||id}基础值待配置`);continue}const weighted=level+(skillOnly(key)&&id===c.class_levels[0]?3:0);parts.push({label:`${rule.name} ${level}级${weighted!==level?'（首级4倍）':''} × ${rate}`,value:product(rate,weighted)});
   if(key==='classSkill'){if(!rule.primary)missing.push(`${rule.name}本职主属性待配置`);else parts.push({label:`${rule.name}长期主属性调整贡献${weighted!==level?'（首级4倍）':''}`,value:product(pointModifier(rule.primary),weighted)})}
  }
  if(key==='fortitude'||key==='reflex'||key==='will'){const first=config.classes[c.class_levels[0]],rate=first?.baseStats?.[key];if(rate===0.5)parts.push({label:'首级职业加值（仅一次）',value:1.5})}
  const attribute:AbilityKey|undefined=key==='melee'?'strength':key==='ranged'||key==='reflex'?'dexterity':key==='fortitude'?'constitution':key==='will'?'wisdom':undefined;
  if(attribute)parts.push({label:'属性调整贡献',value:modifier(attribute)});
  if(key==='crossSkill')parts.push({label:'长期智力调整值 × 等级贡献（首级4倍）',value:product(pointModifier('intelligence'),c.class_levels.length+(c.class_levels.length?3:0))});
  const group=effectGroup(c,key),{long,short}=stackGroups(group.long.filter(e=>!e.context),skillOnly(key)?[]:group.short.filter(e=>!e.context));
  const base=sumNumbers(parts.map(p=>p.value)),scenarios=[...new Set([...group.long,...group.short].map(e=>e.context).filter((s):s is string=>!!s))].map(context=>{const stack=stackGroups(group.long.filter(e=>!e.context||e.context===context),skillOnly(key)?[]:group.short.filter(e=>!e.context||e.context===context));return {context,total:missing.length?null:floorTotal(base,stack.total)}});return [key,{scenarios,total:missing.length?null:floorTotal(base,long,short),base,long,short,parts,missing}];
 })) as Record<DerivedKey,{total:number|null;base:number;long:number;short:number;scenarios:{context:string;total:number|null}[];parts:{label:string;value:number}[];missing:string[]}>;
 if(c.training_character){const training=calculateDerived(c.training_character,config);values.classSkill=training.values.classSkill;values.crossSkill=training.values.crossSkill;}
 return {abilities,values};
}

type AttackEffect=HpEffect&{attackGroup?:string;attackMode?:'melee'|'ranged'};
export function calculateAttackCount(levels:readonly string[],config:Mechanics,long:AttackEffect[]=[],short:AttackEffect[]=[],mode?:'melee'|'ranged'){
 if(!levels.length||levels.some(id=>config.classes[id]?.baseStats?.attack==null))return null;
 const bab=sumNumbers(levels.map(id=>config.classes[id].baseStats!.attack!));
 return Math.max(0,Math.floor(Math.floor((bab+4)/5)+stackGroups(nonstackingAttacks([...long,...short].filter(e=>!e.attackMode||e.attackMode===mode)),[]).total));
}

function nonstackingAttacks(effects:AttackEffect[]){
 const groups=new Map<string,AttackEffect>(),others:AttackEffect[]=[];
 for(const effect of effects){if(!effect.enabled)continue;if(!effect.attackGroup){others.push(effect);continue}const key=`${effect.attackGroup}:${effect.value>=0?'positive':'negative'}`,old=groups.get(key);if(!old||(effect.value>=0?effect.value>old.value:effect.value<old.value))groups.set(key,effect)}
 return [...others,...groups.values()];
}
