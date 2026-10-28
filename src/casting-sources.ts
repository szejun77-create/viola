import {levelAdjusted} from './level-state';
import type {Mechanics,ClassRule} from './mechanics';
import type {RuleState,RuleModule} from './rule-types';
export type CastingSourceSettings=Pick<ClassRule,'spellSlots'|'spellcastingMode'|'spellRecovery'>;
export function extraCastingSources(config:Pick<Mechanics,'modules'|'castingSources'>){const result:Record<string,CastingSourceSettings&{name:string}>={};for(const m of Object.values(config.modules??{}))if(m.grantsCasting)result[m.grantsCasting.id]={name:m.grantsCasting.name,spellcastingMode:m.grantsCasting.spellcastingMode??'spontaneous',spellSlots:{},...config.castingSources?.[m.grantsCasting.id]};return result}
export function castingRule(config:Mechanics,id:string){return config.classes[id]??extraCastingSources(config)[id]}
export function activeCastingSourceIds(levels:string[],config:Pick<Mechanics,'modules'>,state?:RuleState){const view=levelAdjusted({class_levels:levels,rule_state:state},config);levels=view.class_levels;state=view.rule_state;return [...new Set([...levels,...(state?.instances??[]).flatMap(i=>{if(i.levelSuppressed)return [];const m=config.modules?.[i.moduleId];return m?.grantsCasting?[m.grantsCasting.id]:[]})])]}
export function castingBaseLevel(levels:string[],id:string,config:Pick<Mechanics,'modules'>,state?:RuleState){const view=levelAdjusted({class_levels:levels,rule_state:state},config);levels=view.class_levels;state=view.rule_state;const source=(state?.instances??[]).filter(i=>!i.levelSuppressed).map(i=>config.modules?.[i.moduleId]?.grantsCasting).find(source=>source?.id===id);return source?(source.levelClass?levels.filter(c=>c===source.levelClass).length:levels.length):levels.filter(c=>c===id).length}
export function moduleSourceDeclarations(modules:Record<string,RuleModule>){return Object.values(modules).flatMap(m=>m.grantsCasting?[m.grantsCasting.id]:[])}

export function sourceSpellClass(config:Pick<Mechanics,'modules'>|undefined,id:string){return Object.values(config?.modules??{}).find(m=>m.grantsCasting?.id===id)?.grantsCasting?.spellClass??id}
