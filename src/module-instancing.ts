import type {RuleModule,RuleState} from './rule-types';
export function assignModuleInstances(state:RuleState,ids:string[],modules:Record<string,RuleModule>):RuleState{
 const added:RuleState['instances']=[],visiting=new Set<string>();
 function add(id:string,linked=false){const m=modules[id];if(!m)throw Error(`模块未定义：${id}`);if(visiting.has(id))throw Error('自动授予模块不能循环');if(linked&&[...state.instances,...added].some(i=>i.moduleId===id))return;visiting.add(id);added.push({id:crypto.randomUUID(),moduleId:id,enabled:m.mode==='passive',access:m.defaultAccess??'gm',...(m.defaultAcquiredLevel!==undefined?{acquiredLevel:m.defaultAcquiredLevel}:{}),params:Object.fromEntries(Object.entries(m.parameters).map(([key,input])=>[key,input.default]))});for(const child of m.grantsModules??[])add(child,true);visiting.delete(id)}
 for(const id of ids)add(id);if(state.instances.length+added.length>1000)throw Error('含自动授予项在内，角色最多1000个模块');return {...state,instances:[...state.instances,...added]};
}
