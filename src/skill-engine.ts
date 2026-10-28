import {skillCheck,skillScenarios} from './skill-values';
import {prepareShared,type SharedEffect} from './shared-effects';
import {allSkills,classSkillsFor} from './skills';
import type {Mechanics} from './mechanics';
import {calculateDerived} from './calculator';
import {type ModuleCharacter} from './rule-engine';
import type {RuleState} from './rule-types';
export function calculateSkills(c:ModuleCharacter,config:Mechanics,incoming:SharedEffect[]=[]){
 const report=prepareShared(c,config,incoming),derived=calculateDerived(report.character,config),levels=c.class_levels,counts=new Map<string,number>();for(const id of levels)counts.set(id,(counts.get(id)??0)+1);
 const values=c.rule_state?.skills??{},totalCap=levels.length?levels.length+3:0;
 const rows=allSkills.map(skill=>{let classCap=0;for(const[id,count]of counts)if(classSkillsFor(config,id).includes(skill.id))classCap+=count;if(levels[0]&&classSkillsFor(config,levels[0]).includes(skill.id))classCap+=3;const points=values[skill.id]??{class:0,cross:0},ranks=points.class+points.cross,modifier=Math.floor((derived.abilities[skill.ability]-10)/2),base=ranks+modifier,own=report.extras[`skill.${skill.id}`]??{long:[],short:[]},received=report.character.skill_effects?.[skill.id]??{long:[],short:[]},group={long:[...own.long,...received.long],short:[...own.short,...received.short]},check=skillCheck(base,group),scenarios=skillScenarios(base,group);return {...skill,automaticFailure:report.autoFailures?.[skill.id]??[],classCap,totalCap,classPoints:points.class,crossPoints:points.cross,ranks,modifier,group,...check,scenarios}});
 const usedClass=rows.reduce((sum,r)=>sum+r.classPoints,0),usedCross=rows.reduce((sum,r)=>sum+r.crossPoints,0),classBudget=derived.values.classSkill.total,crossBudget=derived.values.crossSkill.total;
 return {rows,totalCap,usedClass,usedCross,classBudget,crossBudget};
}
export function validateSkillState(c:ModuleCharacter,config:Mechanics,next:RuleState,incoming:SharedEffect[]=[]) {
 const skills=next.skills??{};if(!skills||typeof skills!=='object'||Array.isArray(skills)||Object.keys(skills).length>allSkills.length)throw Error('技能投入格式错误');
 for(const[id,points]of Object.entries(skills)){if(!allSkills.some(s=>s.id===id)||!points||typeof points!=='object'||Array.isArray(points)||Object.keys(points).some(k=>k!=='class'&&k!=='cross')||!Number.isSafeInteger(points.class)||!Number.isSafeInteger(points.cross)||points.class<0||points.cross<0)throw Error('技能投入需为非负整数，且必须使用已定义技能')}
 const result=calculateSkills({...c,rule_state:next},config,incoming);
 for(const row of result.rows){if(row.classPoints>row.classCap)throw Error(`${row.name}本职投入不能超过${row.classCap}`);if(row.ranks>row.totalCap)throw Error(`${row.name}总投入不能超过${row.totalCap}`)}
 if(result.usedClass&&(result.classBudget===null||result.usedClass>result.classBudget))throw Error(result.classBudget===null?'本职技能点总量尚未配置':'本职技能点投入超过可用总量');
 if(result.usedCross&&(result.crossBudget===null||result.usedCross>result.crossBudget))throw Error(result.crossBudget===null?'跨职技能点总量尚未配置':'跨职技能点投入超过可用总量');
 return result;
}
