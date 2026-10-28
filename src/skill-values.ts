import {stackGroups} from './bonuses';
import {floorTotal} from './decimal';
import type {EffectGroup} from './calculator';
// Preserve distinct tasks such as reading a scroll; merge only these synonyms.
export function skillContext(context:string){return /^(目标|对象)为卷轴(的时候|时)?$/.test(context.trim())?'对象为卷轴':context}
export function skillCheck(base:number,group:EffectGroup={long:[],short:[]},context?:string|string[]){
 const selected=new Set((Array.isArray(context)?context:context?[context]:[]).map(skillContext));const applies=(e:EffectGroup['long'][number])=>!e.context||selected.has(skillContext(e.context));
 const stack=stackGroups(group.long.filter(applies),group.short.filter(applies));return {total:floorTotal(base,stack.total),bonus:stack.total,stack};
}
export function skillScenarios(base:number,group:EffectGroup){const normal=skillCheck(base,group);return [...new Set([...group.long,...group.short].map(e=>e.context).filter((s):s is string=>!!s).map(skillContext))].map(context=>{const value=skillCheck(base,group,context);return {context,total:value.total,delta:value.total-normal.total}})}
