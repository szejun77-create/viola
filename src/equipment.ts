import {damageStep} from './weapon-damage';
import type {RuleCatalog,RuleState,RuleModule} from './rule-types';
export const equipmentTypes=[['stance','架势／光环'],['secondary_stance','次要架势／光环'],['weapon','武器'],['armor','盔甲'],['shield','盾牌'],['wrists','手腕'],['inner_robe','内袍'],['face','面部'],['feet','脚部'],['hands','手部'],['head','头部'],['ring','戒指'],['shoulders','肩外袍'],['neck','颈部'],['torso','躯干衣'],['waist','腰部'],['special','特殊']] as const;
export type EquipmentType=typeof equipmentTypes[number][0];
export const equipmentSlots=[['stance','架势／光环'],['secondary_stance','次要架势／光环'],['weapon','武器'],['secondary_weapon','副武器'],['armor','盔甲'],['shield','盾牌'],['wrists','手腕'],['inner_robe','内袍'],['face','面部'],['feet','脚部'],['hands','手部'],['head','头部'],['left_ring','左手戒指'],['right_ring','右手戒指'],['shoulders','肩外袍'],['neck','颈部'],['torso','躯干衣'],['waist','腰部'],['special','特殊']] as const;
export function equipmentType(slot:string):EquipmentType|undefined{if(slot==='secondary_weapon')return 'weapon';if(slot==='left_ring'||slot==='right_ring')return 'ring';if(slot==='special'||/^special_[a-z0-9-]{1,64}$/.test(slot))return 'special';return equipmentTypes.find(([id])=>id===slot&&id!=='ring')?.[0]}
export function equipmentRows(equipment:Record<string,string>={}){return [...equipmentSlots.map(([id,label])=>({id,label})),...Object.keys(equipment).filter(id=>id!=='special'&&equipmentType(id)==='special').map((id,index)=>({id,label:`特殊 ${index+2}`}))]}
export function fitsEquipment(module:RuleModule|undefined,slot:string){return !!module&&(module.category==='item'||module.category==='spell'&&(slot==='stance'||slot==='secondary_stance'))&&module.equipmentSlot===equipmentType(slot)&&!(slot==='secondary_weapon'&&twoHanded(module))}
// Selecting an already-equipped instance moves it, swapping compatible occupied slots.
export function selectEquipment(state:RuleState,catalog:RuleCatalog,slot:string,instanceId:string):RuleState{
 if(instanceId){const instance=state.instances.find(i=>i.id===instanceId);if(!instance||!fitsEquipment(catalog.modules[instance.moduleId],slot))throw Error('请选择符合此位置的已分配模块；主要与次要架势／光环不能互换');}
 if(slot==='secondary_weapon'&&instanceId&&twoHanded(mainWeapon(state,catalog)))throw Error('双手武器已占用副武器位置');
 const equipment={...state.equipment},old=equipment[slot]??'';
 for(const [other,id]of Object.entries(equipment))if(other!==slot&&instanceId&&id===instanceId){const oldModule=catalog.modules[state.instances.find(i=>i.id===old)?.moduleId??''];equipment[other]=old&&fitsEquipment(oldModule,other)?old:''}
 equipment[slot]=instanceId;if(slot==='weapon'&&twoHanded(catalog.modules[state.instances.find(i=>i.id===instanceId)?.moduleId??'']))equipment.secondary_weapon='';return {...state,equipment};
}
export function validateEquipment(state:RuleState,catalog:RuleCatalog){
 if(state.equipment===undefined)return;
 if(!state.equipment||typeof state.equipment!=='object'||Array.isArray(state.equipment))throw Error('装备位置格式无效');
 if(twoHanded(mainWeapon(state,catalog))&&state.equipment.secondary_weapon)throw Error('双手武器已占用副武器位置');
 const used=new Set<string>();for(const [slot,id]of Object.entries(state.equipment)){if(!equipmentType(slot)||typeof id!=='string')throw Error('装备位置无效');if(!id)continue;const instance=state.instances.find(i=>i.id===id);if(!instance||!fitsEquipment(catalog.modules[instance.moduleId],slot))throw Error('请选择角色已有且符合位置的装备');if(used.has(id))throw Error('同一件装备不能同时占用多个位置');used.add(id)}
}

export interface WeaponDefinition {type?:string;baseDamage:string;sizeDamage:string;damage:string;damageNote?:string;size:string;criticalWidth:number;criticalMultiplier:number;enhancement:number}
export const weaponTagLabels:Record<string,string>={light:'轻型武器',thrown:'投掷',two_handed:'双手',melee:'近战',ranged:'远程',magic_weapon:'魔法武器'};
export const greatsword:RuleModule={id:'small_enchanted_greatsword',name:'小型＋2巨剑·猛击·警戒·笼手·剃刃·锯齿',category:'item',equipmentSlot:'weapon',mode:'passive',description:'＋2增强、警戒、剃刃、猛击已接入；笼手效果待配置。锯齿通过持续备忘手动登记目标和轮数。',tags:['two_handed','melee','magic_weapon'],weapon:{type:'greatsword',baseDamage:'1d10',sizeDamage:'1d10',damage:'1d10',damageNote:'小型武器起始1d10；体型及武器等效体型变化按房规档位计算。',size:'小型',criticalWidth:2,criticalMultiplier:2,enhancement:2},parameters:{},resourceMaxModifiers:[{tag:'smite',value:'1',bonusType:'unnamed'}],outputs:[{target:'ranged',scope:'weapon',duration:'short',bonusType:'enhancement',value:'2'},{target:'melee',scope:'weapon',duration:'short',bonusType:'enhancement',value:'2'},{target:'damage',scope:'weapon',duration:'short',bonusType:'enhancement',value:'2'},{target:'initiative',duration:'short',bonusType:'insight',value:'5'},{target:'damage',scope:'weapon',duration:'short',bonusType:'unnamed',value:'1'},{target:'melee',scope:'weapon',duration:'short',bonusType:'unnamed',value:'2',when:'tags.smite.active'},{target:'ranged',scope:'weapon',duration:'short',bonusType:'unnamed',value:'2',when:'tags.smite.active'},{target:'damage',scope:'weapon',duration:'short',bonusType:'unnamed',value:'2',when:'tags.smite.active'}]};
export function twoHanded(module:RuleModule|undefined){return module?.category==='item'&&module.equipmentSlot==='weapon'&&!!module.tags?.includes('two_handed')}
export function mainWeapon(state:RuleState,catalog:RuleCatalog){const instance=state.instances.find(i=>i.id===state.equipment?.weapon);return instance?catalog.modules[instance.moduleId]:undefined}
export function weaponCritical(weapon:WeaponDefinition){return weapon.criticalWidth===1?'20':`${21-weapon.criticalWidth}–20`}
export function validateWeaponDefinition(module:RuleModule){
 if(module.tags!==undefined&&(!Array.isArray(module.tags)||module.tags.length>64||module.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>100)||new Set(module.tags).size!==module.tags.length))throw Error('tags需为不重复的文字数组');
 const w=module.weapon;if(w===undefined)return;if(w.type!==undefined&&(typeof w.type!=='string'||!/^[a-z][a-z0-9_]{0,63}$/.test(w.type)))throw Error('武器type需为英文种类标识');
 if(module.category!=='item'||module.equipmentSlot!=='weapon'||!w||typeof w!=='object'||Array.isArray(w))throw Error('武器基础资料仅用于weapon位置的装备');
 for(const key of ['baseDamage','sizeDamage','damage'] as const)if(typeof w[key]!=='string'||!/^([1-9]\d{0,2})d([1-9]\d{0,2})$/.test(w[key]))throw Error('武器伤害骰格式应为2d6、1d8等');
 if(damageStep(w.baseDamage)<0)throw Error('武器起始伤害骰必须属于房规14档序列（含同档特殊骰型）');
 if(typeof w.size!=='string'||!w.size.trim()||w.size.length>100||w.damageNote!==undefined&&(typeof w.damageNote!=='string'||w.damageNote.length>1000))throw Error('武器体型或伤害说明无效');
 if(!Number.isInteger(w.criticalWidth)||w.criticalWidth<1||w.criticalWidth>20||!Number.isInteger(w.criticalMultiplier)||w.criticalMultiplier<1||w.criticalMultiplier>100||!Number.isInteger(w.enhancement)||w.enhancement<0||w.enhancement>100)throw Error('暴击宽度为1–20，倍数为1–100，增强等级为0–100的整数');
}

// Correct only the previous built-in prototype; preserve independently edited weapons.
export function upgradeGreatswordModules(modules:Record<string,RuleModule>|undefined){if(!modules)return modules;const old=modules[greatsword.id],w=old?.weapon;if(!w)return modules;const legacy=w.baseDamage==='2d6'&&w.sizeDamage==='1d8'&&w.damage==='2d6'&&w.damageNote==='巨武招式恢复2d6，目前手动记录，不自动查询能力。',plain=old.outputs.length===0&&old.description==='本次录入基础资料；猛击、警戒、笼手、剃刃、锯齿及＋2增强效果后续逐项接入。';if(!legacy&&!plain&&w.type!==undefined)return modules;return {...modules,[greatsword.id]:{...old,...(plain?{outputs:structuredClone(greatsword.outputs),resourceMaxModifiers:structuredClone(greatsword.resourceMaxModifiers),description:greatsword.description}:{}),weapon:legacy?{...w,type:w.type??'greatsword',baseDamage:'1d10',sizeDamage:'1d10',damage:'1d10',damageNote:greatsword.weapon!.damageNote}:{...w,type:w.type??'greatsword'}}}}
