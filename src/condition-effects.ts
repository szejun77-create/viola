import {resolveConditions,type ConditionConfig} from './conditions';
import {allSkills} from './skills';
import {abilityKeys,effectGroup,type EffectGroup,type StatKey} from './calculator';
import type {ModuleCharacter} from './rule-engine';
import {evaluateExpression} from './rule-expression';
import type {ModuleEffect,ModuleTarget,PreparedNote,RuleState} from './rule-types';
// Rebuild generated rows on every evaluation; never write them into saved character sources.
export function applyConditions<T extends ModuleCharacter>(original:T,state:RuleState,config:ConditionConfig){
 const active=resolveConditions(state,config),clean=(g:EffectGroup):EffectGroup=>({long:g.long.filter(e=>!e.id.startsWith('condition:')),short:g.short.filter(e=>!e.id.startsWith('condition:'))});
 const c={...original,condition_ability_set:{},stat_effects:{...original.stat_effects},hp_long_effects:(original.hp_long_effects??[]).filter(e=>!e.id.startsWith('condition:')),hp_short_effects:(original.hp_short_effects??[]).filter(e=>!e.id.startsWith('condition:')),skill_effects:Object.fromEntries(Object.entries(original.skill_effects??{}).map(([id,g])=>[id,clean(g)]))} as T;
 for(const key of [...abilityKeys,'melee','ranged','fortitude','reflex','will','classSkill','crossSkill'] as StatKey[])if(original.stat_effects?.[key])c.stat_effects![key]=clean(original.stat_effects[key]!);
 const rows:{target:ModuleTarget;duration:'short';effect:ModuleEffect}[]=[],notes:PreparedNote[]=[],autoFailures:Record<string,string[]>={};
 for(const d of active.active){
  for(const [key,value]of Object.entries(d.abilitySet??{})){const k=key as typeof abilityKeys[number];c.condition_ability_set![k]=Math.min(c.condition_ability_set![k]??Infinity,value!)}
  for(const [index,o]of (d.outputs??[]).entries()){
   const effect:ModuleEffect={id:`condition:${d.id}:${index}`,origin:`condition:${d.id}`,name:d.name,target:o.target,value:o.value,enabled:true,bonusType:o.bonusType??'unnamed'};
   if(abilityKeys.includes(o.target as typeof abilityKeys[number])||['melee','ranged','fortitude','reflex','will','classSkill','crossSkill'].includes(o.target)){const key=o.target as StatKey,g=c.stat_effects?.[key]??effectGroup(c,key);c.stat_effects![key]={long:[...g.long],short:[...g.short]};c.stat_effects![key]![key==='classSkill'||key==='crossSkill'?'long':'short'].push(effect)}
   else if(o.target.startsWith('skill.')){const id=o.target.slice(6),g=c.skill_effects![id]??{long:[],short:[]};c.skill_effects![id]={long:[...g.long],short:[...g.short,effect]}}
   else rows.push({target:o.target,duration:'short',effect});
  }
  (d.skillModifiers??[]).forEach((m,index)=>{for(const skill of allSkills){if(m.ability&&m.ability!==skill.ability||m.skills&&!m.skills.includes(skill.id))continue;const g=c.skill_effects![skill.id]??{long:[],short:[]};c.skill_effects![skill.id]={long:[...g.long],short:[...g.short,{id:`condition:${d.id}:skill:${index}:${skill.id}`,name:d.name,value:m.value,enabled:true,bonusType:'unnamed'}]}}});
  for(const id of d.autoFailSkills??[])(autoFailures[id]??=[]).push(d.name);
  for(const n of d.notes??[])if(!n.when||evaluateExpression(n.when,active.read)===true)notes.push({instanceId:`condition:${d.id}`,name:d.name,text:n.text,category:n.category??'negative'});
 }
 return {character:c,rows,notes,autoFailures};
}
