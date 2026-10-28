import {validateSpellConfiguration,type SpellSlotTable} from './spell-preparation';
import {withSmiteDefaults} from './module-effects';
import {upgradeGreatswordModules} from './equipment';
import {validateConditions,type ConditionDefinition} from './conditions';
import {defaultSkillSynergies,validateSynergies,type SkillSynergy} from './skill-synergies';
import {allSkills,defaultClassSkills} from './skills';
import {validateCatalog,ruleCatalog} from './rule-schema';
import {type RuleModule,type RuleInput} from './rule-types';
import {sumNumbers,product} from './decimal';
import {classes,type AbilityKey,type ClassDefinition} from './character-model';
export const races=['人类','强心半身人','幼年灰精灵','修补匠侏儒'] as const;
export const metrics=[['hp','基础生命'],['attack','基础命中'],['fortitude','基础强韧'],['reflex','基础反射'],['will','基础意志'],['classSkill','基础本职技能点'],['crossSkill','基础跨职技能点']] as const;
export interface ClassRule {spellcastingMode?:'prepared'|'spontaneous';spellRecovery?:boolean;spellSlots?:SpellSlotTable;classSkills?:string[];name:string;hpPerLevel:number|null;baseStats?:Partial<Record<typeof metrics[number][0],number|null>>;primary:AbilityKey|'';[legacy:string]:unknown}
export interface Mechanics {castingSources?:Record<string,import('./casting-sources').CastingSourceSettings>;metamagic?:(import('./rule-types').MetamagicSettings&{id:string;name:string})[];schemaVersion:2;conditions?:Record<string,ConditionDefinition>;skillSynergies?:SkillSynergy[];modules?:Record<string,RuleModule>;weaponVariables?:Record<string,RuleInput>;classes:Record<string,ClassRule>;races:Record<string,{size:string;speed:number|null;unit:string}>;[legacy:string]:unknown}
export interface MechanicsRecord {id:string;config:Mechanics;version:number}
export function defaultMechanics():Mechanics{return {schemaVersion:2,skillSynergies:structuredClone(defaultSkillSynergies),classes:Object.fromEntries(classes.map(c=>[c.id,{name:c.name,hpPerLevel:null,primary:'',classSkills:[...(defaultClassSkills[c.id]??[])]}])),races:Object.fromEntries(races.map(r=>[r,{size:'',speed:null,unit:'尺'}]))}}
export function classCatalog(config:Mechanics):ClassDefinition[]{return Object.entries(config.classes).map(([id,def])=>({id,name:def.name}))}
export function upgradeMechanicsRecord(record:MechanicsRecord):MechanicsRecord {
 record={...record,config:{...record.config,modules:withSmiteDefaults(upgradeGreatswordModules(record.config.modules))}};
 if(record.config?.schemaVersion===2)return {...record,config:{...record.config,skillSynergies:record.config.skillSynergies??structuredClone(defaultSkillSynergies),classes:Object.fromEntries(Object.entries(record.config.classes).map(([id,c])=>[id,{...c,classSkills:c.classSkills??[...(defaultClassSkills[id]??[])]}]))}};
 const old=record.config as unknown as {classes?:Record<string,Record<string,unknown>>;races?:Mechanics['races']};
 const fallback=defaultMechanics();
 return {...record,config:{...record.config,schemaVersion:2,skillSynergies:record.config.skillSynergies??structuredClone(defaultSkillSynergies),classes:Object.fromEntries(classes.map(c=>[c.id,{...old?.classes?.[c.id],name:c.name,hpPerLevel:null,classSkills:[...(defaultClassSkills[c.id]??[])],primary:(old?.classes?.[c.id]?.primary||'') as ClassRule['primary']}])),races:old.races||fallback.races}};
}
export function validateMechanics(value:unknown):value is Mechanics {
 if(!value||typeof value!=='object')return false;const x=value as Mechanics;
 if(x.schemaVersion!==2||!x.classes||!x.races||typeof x.races!=='object'||Array.isArray(x.races)||typeof x.classes!=='object'||Array.isArray(x.classes))return false;
 try{validateSpellConfiguration(x);validateConditions(x);validateCatalog(ruleCatalog(x));validateSynergies(x.skillSynergies??defaultSkillSynergies)}catch{return false}
 const abilities=['','strength','dexterity','constitution','intelligence','wisdom','charisma'];const entries=Object.entries(x.classes),names=new Set<string>();
 return classes.every(c=>Object.hasOwn(x.classes,c.id))&&entries.length<=200&&entries.every(([id,c])=>{if(!/^[a-z][a-z0-9-]{0,79}$/.test(id)||!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>100||names.has(c.name.trim()))return false;names.add(c.name.trim());return (c.classSkills===undefined||Array.isArray(c.classSkills)&&c.classSkills.every(id=>allSkills.some(skill=>skill.id===id))&&new Set(c.classSkills).size===c.classSkills.length)&&(!c.baseStats||typeof c.baseStats==='object'&&!Array.isArray(c.baseStats)&&Object.values(c.baseStats).every(v=>v===null||typeof v==='number'&&Number.isFinite(v)))&&abilities.includes(c.primary)&&(c.hpPerLevel===null||typeof c.hpPerLevel==='number'&&Number.isFinite(c.hpPerLevel)&&c.hpPerLevel>=0)})&&races.every(r=>Object.hasOwn(x.races,r))&&Object.keys(x.races).length<=200&&Object.entries(x.races).every(([r,def])=>{return !!r.trim()&&r.length<=100&&!!def&&typeof def.size==='string'&&def.size.length<=100&&typeof def.unit==='string'&&def.unit.length>0&&def.unit.length<=20&&(def.speed===null||typeof def.speed==='number'&&Number.isFinite(def.speed)&&def.speed>=0)})
}
export interface CalculatedMetric {value:number|null;parts:{label:string;value:number|null}[];missing:string[]}
export function calculateBasics(levels:readonly string[],race:string,config:Mechanics){
 const counts=new Map<string,number>();levels.forEach(id=>counts.set(id,(counts.get(id)||0)+1));
 const hp:CalculatedMetric={value:null,parts:[],missing:[]};if(!levels.length)hp.missing.push('尚未分配职业等级');
 for(const[id,count]of counts){const rule=config.classes[id],perLevel=rule?.hpPerLevel??null;hp.parts.push({label:`${rule?.name||id} ${count} 级 × ${perLevel??'待配置'}`,value:perLevel===null?null:product(count,perLevel)});if(perLevel===null)hp.missing.push(`${rule?.name||id}每级基础生命待配置`)}
 if(!hp.missing.length)hp.value=sumNumbers(hp.parts.map(p=>p.value??0));
 const values=Object.fromEntries(metrics.map(([key])=>[key,key==='hp'?hp:{value:null,parts:[],missing:['此项算法待后续确认']}])) as Record<typeof metrics[number][0],CalculatedMetric>;
 return {values,race:config.races[race],primary:[...counts].map(([id])=>({name:config.classes[id]?.name||id,ability:config.classes[id]?.primary||''}))};
}
