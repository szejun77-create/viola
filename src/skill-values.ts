import {stackGroups} from './bonuses';
import {floorTotal} from './decimal';
import type {EffectGroup} from './calculator';
export function skillCheck(base:number,group:EffectGroup={long:[],short:[]},context?:string|string[]){
 const selected=new Set(Array.isArray(context)?context:context?[context]:[]);const applies=(e:EffectGroup['long'][number])=>!e.context||selected.has(e.context);
 const stack=stackGroups(group.long.filter(applies),group.short.filter(applies));return {total:floorTotal(base,stack.total),bonus:stack.total,stack};
}
export function skillScenarios(base:number,group:EffectGroup){const normal=skillCheck(base,group);return [...new Set([...group.long,...group.short].map(e=>e.context).filter((s):s is string=>!!s))].map(context=>{const value=skillCheck(base,group,context);return {context,total:value.total,delta:value.total-normal.total}})}
