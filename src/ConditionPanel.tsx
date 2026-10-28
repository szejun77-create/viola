import {mountCandidates,selectedMount} from './mounts';
import type {CharacterPeer} from './shared-effects';
import {createModuleTextRenderer} from './module-text';
import type {ModuleCharacter} from './rule-engine';
import type {Mechanics} from './mechanics';
import {clearBlockedConditions,conditionCatalog,conditionDescription,resolveConditions,type ConditionDefinition} from './conditions';
import type {RuleState} from './rule-types';
export function ConditionPanel({state,config,onChange,busy,character,roster=[],view='all'}:{view?:'all'|'active'|'states';roster?:CharacterPeer[];character:ModuleCharacter;state:RuleState;config:Mechanics;onChange:(s:RuleState)=>void;busy:boolean}){
 const renderText=createModuleTextRenderer(character,config,state);
 const characterId=(character as ModuleCharacter&{id:string}).id,mount=selectedMount(characterId,state,roster),mounts=mountCandidates(characterId,roster);
 const definitions=conditionCatalog(config),resolved=resolveConditions(state,config);
 const options=(rows:ConditionDefinition[])=>rows.map(condition=>{const manual=state.conditions?.[condition.id]??false,derived=resolved.sources[condition.id]??[];return <label className="condition-option" key={condition.id}><input type="checkbox" aria-label={condition.name} disabled={busy||resolved.blocked.has(condition.id)||condition.id==='mounted'&&!mount&&!manual} checked={manual} onChange={e=>onChange(clearBlockedConditions({...state,mountId:condition.id==='mounted'&&e.target.checked?mount?.id:state.mountId,conditions:{...state.conditions,[condition.id]:e.target.checked},conditionCounts:{...state.conditionCounts,...(condition.upgrade?{[condition.id]:1}:{})}},config))}/><span>{condition.name}{derived.length>0&&<small>（由{derived.join('、')}生效）</small>}{manual&&condition.upgrade&&(state.conditionCounts?.[condition.id]??1)>=condition.upgrade.count&&<small>（已转为{definitions.find(d=>d.id===condition.upgrade!.id)?.name}）</small>}</span></label>});
 const effects=(rows:ConditionDefinition[])=>rows.filter(c=>resolved.flags[c.id]||state.conditions?.[c.id]).map(condition=><div key={condition.id}><p className="prewrap"><strong>{condition.name}</strong>：{renderText(conditionDescription(condition.id,config,state))}</p>{condition.upgrade&&state.conditions?.[condition.id]&&<button type="button" className="secondary" disabled={busy||(state.conditionCounts?.[condition.id]??1)>=condition.upgrade.count} onClick={()=>onChange({...state,conditionCounts:{...state.conditionCounts,[condition.id]:Math.min(condition.upgrade!.count,(state.conditionCounts?.[condition.id]??1)+1)}})}>再次{condition.name}</button>}</div>);
 const active=definitions.filter(c=>c.tags?.includes('active_entry')),other=definitions.filter(c=>!c.tags?.includes('active_entry'));
 const mountSelector=mounts.length>0&&<label className="mount-inline">坐骑<select aria-label="选择坐骑" value={mount?.id??state.mountId??''} disabled={busy} onChange={e=>onChange(clearBlockedConditions({...state,mountId:e.target.value,conditions:e.target.value?state.conditions:{...state.conditions,mounted:false}},config))}><option value="">请选择坐骑</option>{mounts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>;
 const activeControls=<><strong>主动进入</strong>{mountSelector}<div className="condition-grid">{options(active)}</div>{active.some(c=>resolved.flags[c.id])&&<details className="active-entry-help"><summary>已选状态说明</summary><div className="condition-effects">{effects(active)}</div></details>}</>;
 const states=<details className="status-fold"><summary>状态 <small>{other.filter(c=>resolved.flags[c.id]).length||''}</small></summary><div className="condition-grid">{options(other)}</div><div className="condition-effects">{effects(other)}</div><p className="muted">勾选框记录手动状态；联动状态单独标明来源。修改后保存状态。</p></details>;
 if(view==='active')return <section className="active-entry-inline">{activeControls}</section>;
 if(view==='states')return states;
 return <section className="panel condition-panel">{activeControls}{states}</section>;
}
