import {effectiveBaseHp,levelAdjusted} from './level-state';
import {QuickStats} from './QuickStats';
import {MemoPanel} from './MemoPanel';
export {MemoPanel} from './MemoPanel';
import {movementDisplay} from './mounts';
import {energyResistances} from './rule-types';
import {calculateCasterLevel} from './caster-level';
import {casterPools} from './spell-preparation';
import {createModuleTextRenderer} from './module-text';
import {calculateAttackCount} from './calculator';
import {SpellResourcePanel,StanceSelector} from './SpellResourcePanel';
import {SpellPreparationPanel} from './SpellPreparationPanel';
import {armorSpeed} from './armor';
import {TimedEffectPanel} from './TimedEffectPanel';
import {WeaponDamagePanel} from './WeaponDamagePanel';
import {equipmentRows,fitsEquipment,selectEquipment,mainWeapon,twoHanded,weaponCritical,weaponTagLabels} from './equipment';
import {conditionSpeed} from './conditions';
import {ConditionPanel} from './ConditionPanel';
import {calculateDefenses} from './defenses';
import {ReceivedEffects} from './ReceivedEffects';
import {prepareShared,type SharedEffect,type CharacterPeer} from './shared-effects';
import {noteCategories,type PreparedNote} from './rule-types';
import {ResourcePanel} from './ResourcePanel';
import type {ResourceActionRequest} from './resource-engine';
import {useState} from 'react';
import type {Character} from './main';
import type {MechanicsRecord} from './mechanics';
import {calculateBasics} from './mechanics';
import {abilityKeys,calculateDerived,derivedFields} from './calculator';
import {calculateHp} from './hp';
import {prepareModules,stateOf} from './rule-engine';
import {ruleCatalog} from './rule-schema';
import {stackGroups} from './bonuses';
import {ModuleControls} from './ModuleSidebar';
const abilityLabels=['力量','敏捷','体质','智力','感知','魅力'];
type Props={incoming?:SharedEffect[];roster?:CharacterPeer[];c:Character;gm:boolean;busy:boolean;mechanics:MechanicsRecord;save:(c:Character,patch:Partial<Character>,action?:ResourceActionRequest)=>Promise<void>};
export function CharacterModuleList({c,mechanics,kind,gm,onManage,busy,save}:{c:Character;mechanics:MechanicsRecord;kind:'abilities'|'spells'|'equipment';gm:boolean;onManage:()=>void;busy:boolean;save:Props['save']}){
 const catalog=ruleCatalog(mechanics.config),instances=stateOf(c).instances,renderText=createModuleTextRenderer(c,mechanics.config);
 const groups=kind==='abilities'?[['feat','专长'],['class','职业能力'],['race','种族能力'],['other','其他能力']]:kind==='spells'?[['spell','掌握法术']]:[['item','装备']];
 if(kind==='spells')return <SpellPreparationPanel c={c} config={mechanics.config} gm={gm} onManage={onManage} busy={busy} save={save}/>;
 if(kind==='equipment')return <EquipmentSlots c={c} mechanics={mechanics} gm={gm} onManage={onManage} busy={busy} save={save}/>;
 return <section className="character-list"><div className="list-toolbar"><strong>{c.name}</strong>{gm&&<button className="secondary" onClick={onManage}>分配／管理模块</button>}</div>{groups.map(([category,title])=>{const rows=instances.filter(i=>catalog.modules[i.moduleId]?.category===category);if(kind==='abilities')rows.sort((a,b)=>a.acquiredLevel===undefined?(b.acquiredLevel===undefined?0:1):b.acquiredLevel===undefined?-1:a.acquiredLevel-b.acquiredLevel);return <section className="panel ability-section" key={category}><h2>{title}<small>{rows.length}</small></h2>{rows.length?rows.map(instance=>{const module=catalog.modules[instance.moduleId],suppressed=levelAdjusted(c,mechanics.config).rule_state?.instances.find(i=>i.id===instance.id)?.levelSuppressed;return <article className="ability-entry" key={instance.id}><div><h3>{module.name}</h3>{module.description&&<p className="prewrap">{renderText(module.description,instance.id)}</p>}{kind==='abilities'&&<dl className="ability-metadata"><div><dt>获得等级</dt><dd>{instance.acquiredLevel??'未填写'}</dd></div><div><dt>能力来源</dt><dd>{instance.source||'未填写'}</dd></div><div><dt>先决条件</dt><dd>{instance.prerequisites||'未填写'}</dd></div></dl>}</div><span className={`badge ${module.mode==='passive'||instance.enabled?'':'inactive'}`}>{suppressed?'负向等级暂时停用':module.mode==='passive'?'被动常驻':instance.enabled?'已启用':'未启用'}</span></article>}):<p className="muted">尚未分配{title}。</p>}</section>})}</section>
}
export function CompactCalculator({c,gm,busy,mechanics,save,incoming=[],roster=[]}:Props){
 const[d,setD]=useState(c);
 const prepared=prepareShared(d,mechanics.config,incoming),calculated=calculateDerived(prepared.character,mechanics.config),basics=calculateBasics(prepared.character.class_levels,c.race,mechanics.config);
 const defenses=calculateDefenses(stateOf(d),calculated.abilities.dexterity,prepared.extras,mechanics.config);
 const hp=calculateHp(effectiveBaseHp(basics.values.hp.value,prepared.character),calculated.abilities.constitution,prepared.character.class_levels.length,prepared.character.hp_long_effects,prepared.character.hp_short_effects);
 const saveState=(state:ReturnType<typeof stateOf>)=>void save(c,{rule_state:state,...(d.hp!==c.hp?{hp:d.hp}:{}),...(JSON.stringify(d.resources)!==JSON.stringify(c.resources)?{resources:d.resources}:{})});
 return <div className="compact-calculator"><QuickStats d={d} config={mechanics.config} prepared={prepared} roster={roster}/><form className="panel play-mode-panel" onSubmit={e=>{e.preventDefault();saveState(stateOf(d))}}><div className="play-mode-row"><StanceSelector compact c={c} d={d} config={mechanics.config} gm={gm} busy={busy} save={save}/><ConditionPanel view="active" roster={roster} character={d} config={mechanics.config} state={stateOf(d)} onChange={state=>setD({...d,rule_state:state})} busy={busy}/></div><div className="play-status-row"><ConditionPanel view="states" roster={roster} character={d} config={mechanics.config} state={stateOf(d)} onChange={state=>setD({...d,rule_state:state})} busy={busy}/><button disabled={busy}>保存状态</button></div></form><form className="panel player-actions" onSubmit={e=>{e.preventDefault();saveState(stateOf(d))}}><div className="list-toolbar"><h2>玩家操作</h2><button disabled={busy}>保存操作</button></div><ModuleControls roster={roster} character={d} config={mechanics.config} gm={gm} state={stateOf(d)} onChange={state=>setD({...d,rule_state:state})} busy={busy} compact toggleExtras={<ReceivedEffects incoming={incoming} state={stateOf(d)} onChange={state=>setD({...d,rule_state:state})} busy={busy}/>}/></form><MemoPanel characterId={c.id} notes={prepared.notes} state={stateOf(d)} busy={busy} onChange={state=>setD({...d,rule_state:state})} onSave={saveState}/><TimedEffectPanel c={c} d={d} setD={setD} config={mechanics.config} gm={gm} busy={busy} save={save}/><SpellResourcePanel incoming={incoming} roster={roster} c={c} d={d} config={mechanics.config} gm={gm} busy={busy} save={save}/><ResourcePanel incoming={incoming} c={c} d={d} setD={setD} config={mechanics.config} gm={gm} busy={busy} save={save}/></div>
}

function EquipmentSlots({c,mechanics,gm,onManage,busy,save}:{c:Character;mechanics:MechanicsRecord;gm:boolean;onManage:()=>void;busy:boolean;save:Props['save']}){
 const [state,setState]=useState(()=>stateOf(c)),catalog=ruleCatalog(mechanics.config),rows=equipmentRows(state.equipment),blocksOffhand=twoHanded(mainWeapon(state,catalog)),renderText=createModuleTextRenderer(c,mechanics.config,state);
 return <form className="panel equipment-slots" onSubmit={e=>{e.preventDefault();void save(c,{rule_state:state})}}><div className="list-toolbar"><h2>{c.name} · 装备</h2>{gm&&<button type="button" className="secondary" onClick={onManage}>分配／管理装备</button>}</div><div className="equipment-slot-grid">{rows.map(slot=>{const options=state.instances.filter(i=>fitsEquipment(catalog.modules[i.moduleId],slot.id)),selected=options.find(i=>i.id===state.equipment?.[slot.id]),definition=selected?catalog.modules[selected.moduleId]:undefined,blocked=slot.id==='secondary_weapon'&&blocksOffhand;return <div key={slot.id}><label>{slot.label}<select aria-label={`${slot.label}位置`} disabled={busy||blocked} value={selected?.id??''} onChange={e=>setState(selectEquipment(state,catalog,slot.id,e.target.value))}><option value="">{blocked?'双手武器占用':'未装备'}</option>{options.map((i,index)=><option key={i.id} value={i.id}>{catalog.modules[i.moduleId].name}{options.filter(other=>other.moduleId===i.moduleId).length>1?`（${index+1}）`:''}</option>)}</select></label>{definition?.mode==='toggle'&&selected&&<label className="equipment-toggle"><input type="checkbox" aria-label={`启用${definition.name}`} disabled={busy||!gm&&selected.access==='gm'} checked={selected.enabled} onChange={e=>setState({...state,instances:state.instances.map(i=>i.id===selected.id?{...i,enabled:e.target.checked}:i)})}/>启用装备效果</label>}{definition?.tags&&<small>{definition.tags.map(t=>weaponTagLabels[t]??t).join(' · ')}</small>}{definition?.armor&&<div className="armor-profile"><small>{definition.armor.size} · {{light:'轻甲',medium:'中甲',heavy:'重甲'}[definition.armor.category]} · 护甲 {definition.armor.baseArmor}＋增强 {definition.armor.enhancement}</small><small>最大敏捷调整 {definition.armor.dexCap??'不限'} · 防具检定减值 {definition.armor.checkPenalty}</small></div>}{definition?.weapon&&<div className="weapon-profile"><p>{definition.weapon.size} · 起始伤害骰 <strong>{definition.weapon.baseDamage}</strong> · 暴击 <strong>{weaponCritical(definition.weapon)} / ×{definition.weapon.criticalMultiplier}</strong></p><small>按房规体型序列计算当前伤害，见速算卡；增强等级 ＋{definition.weapon.enhancement}</small>{definition.weapon.damageNote&&<small>{definition.weapon.damageNote}</small>}</div>}{definition?.description&&<small className="muted prewrap">{renderText(definition.description,selected?.id)}</small>}{slot.id.startsWith('special_')&&<button type="button" className="secondary" disabled={busy} onClick={()=>{const equipment={...state.equipment};delete equipment[slot.id];setState({...state,equipment})}}>移除此位置</button>}</div>})}</div><div className="config-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setState({...state,equipment:{...state.equipment,[`special_${crypto.randomUUID()}`]:''}})}>＋ 增加特殊位置</button><button type="button" className="secondary" disabled={busy} onClick={()=>setState({...state,equipment:{...state.equipment,left_ring:state.equipment?.right_ring??'',right_ring:state.equipment?.left_ring??''}})}>左右戒指互换</button></div><p className="muted">备选项由GM通过规则模块中的“装备模板”创建并分配。戒指可选任意一手，同一件装备只占一个位置。</p><p className="muted">选用后启用已配置的装备效果，卸下后撤销；换装不会自动增加当前资源次数。</p><button disabled={busy}>保存装备选择</button></form>
}
