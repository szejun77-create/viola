import {calculateCasterLevel} from './caster-level';
import {renderNoteText,noteExpressions} from './note-text';
import {prepareModules,ruleContext,resolver,stateOf,type ModuleCharacter} from './rule-engine';
import {ruleCatalog} from './rule-schema';
import type {Mechanics} from './mechanics';
import type {RuleState} from './rule-types';
export function createModuleTextRenderer(c:ModuleCharacter,config:Mechanics,state:RuleState=stateOf(c)){
 let report:ReturnType<typeof prepareModules>|undefined;
 const catalog=ruleCatalog(config);
 return (text:string,instanceId?:string,castingClassId?:string)=>{try{if(!noteExpressions(text).length)return text;report??=prepareModules({...c,rule_state:state},config);const instance=state.instances.find(i=>i.id===instanceId),module=instance&&catalog.modules[instance.moduleId];return renderNoteText(text,resolver({...ruleContext(report.character,config,stateOf(report.character)),...(castingClassId?{'caster.level':calculateCasterLevel(c.class_levels,castingClassId,report.effects,state,config).total}:{})},module,{catalog,state:stateOf(report.character),instanceId,excluded:new Set(Object.keys(report.errors)),skillEffects:report.character.skill_effects}))}catch(e){return `${text}\n[公式错误：${(e as Error).message}]`}};
}
