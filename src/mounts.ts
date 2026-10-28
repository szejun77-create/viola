import {resolveConditions,type ConditionConfig} from './conditions';
import type {RuleState} from './rule-types';
import type {CharacterPeer} from './shared-effects';
export function mountCandidates(characterId:string,roster:CharacterPeer[]){return roster.filter(p=>p.master_id===characterId&&p.id!==characterId)}
export function selectedMount(characterId:string,state:RuleState,roster:CharacterPeer[]){const choices=mountCandidates(characterId,roster);return state.mountId?choices.find(p=>p.id===state.mountId):choices.length===1?choices[0]:undefined}
export function validateMountSelection(characterId:string,state:RuleState,roster:CharacterPeer[],config:ConditionConfig){if(state.mountId!==undefined&&(typeof state.mountId!=='string'||state.mountId.length>100))throw Error('坐骑选择格式错误');if(resolveConditions(state,config).flags.mounted&&!selectedMount(characterId,state,roster))throw Error('请先选择自己的一个部属作为坐骑')}
export function movementDisplay(characterId:string,state:RuleState,roster:CharacterPeer[],ownSpeed:number|null,ownUnit:string,config:ConditionConfig){if(!resolveConditions(state,config).flags.mounted)return ownSpeed==null?'待配置':`${ownSpeed}${ownUnit}`;const mount=selectedMount(characterId,state,roster);if(!mount)return '请选择坐骑';return mount.movement?.value==null?'坐骑速度待配置':`${mount.movement.value}${mount.movement.unit}`}
