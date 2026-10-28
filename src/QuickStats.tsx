import {effectiveBaseHp} from './level-state';
import {useState,type ReactNode} from 'react';
import type {Character} from './main';
import {calculateBasics,type Mechanics} from './mechanics';
import {abilityKeys,calculateDerived,calculateAttackCount,derivedFields,effectGroup} from './calculator';
import {calculateHp,type HpEffect} from './hp';
import {stackGroups} from './bonuses';
import {calculateDefenses} from './defenses';
import {calculateCasterLevel} from './caster-level';
import {casterPools} from './spell-preparation';
import {armorSpeed} from './armor';
import {movementDisplay,selectedMount} from './mounts';
import {resolveConditions} from './conditions';
import {stateOf} from './rule-engine';
import {ruleCatalog} from './rule-schema';
import {energyResistances,type ModuleTarget} from './rule-types';
import type {prepareShared,CharacterPeer} from './shared-effects';
import {WeaponDamagePanel} from './WeaponDamagePanel';

const labels=['力量','敏捷','体质','智力','感知','魅力'];
const signed=(n:number)=>`${n>=0?'+':''}${n}`;
type Tile={label:string;value:string|number;conditions?:{label:string;value:string|number}[];detail?:ReactNode};
function Sources({long=[],short=[]}:{long?:HpEffect[];short?:HpEffect[]}){
 const rows=stackGroups(long,short).rows;
 return rows.length?<ul className="calculation-sources">{rows.map((row,index)=><li key={`${row.effect.id}-${index}`} className={row.kept?'':'suppressed-source'}><span>{row.effect.name}{'context' in row.effect&&row.effect.context?` · ${row.effect.context}`:''}</span><b>{signed(row.effect.value)}</b><small>{row.reason.split(' / ')[0]}</small></li>)}</ul>:<p className="muted">没有额外来源。</p>;
}
export function QuickStats({d,config,prepared,roster}:{d:Character;config:Mechanics;prepared:ReturnType<typeof prepareShared>;roster:CharacterPeer[]}){
 const [selected,setSelected]=useState<string|null>(null),state=stateOf(d),calculated=calculateDerived(prepared.character,config),basics=calculateBasics(prepared.character.class_levels,d.race,config),defenses=calculateDefenses(state,calculated.abilities.dexterity,prepared.extras,config),hp=calculateHp(effectiveBaseHp(basics.values.hp.value,prepared.character),calculated.abilities.constitution,prepared.character.class_levels.length,prepared.character.hp_long_effects,prepared.character.hp_short_effects),tiles:Tile[]=[{label:'有效等级',value:prepared.character.class_levels.length===d.class_levels.length?d.class_levels.length:`${prepared.character.class_levels.length} / ${d.class_levels.length}`}];
 for(const pool of casterPools(d.class_levels,config,state)){const level=calculateCasterLevel(d.class_levels,pool.classId,prepared.effects,state,config);tiles.push({label:`${pool.name}施法者等级`,value:level.total,detail:<><p>基础 {level.base} ＋ 调整 {signed(level.stack.total)} → {level.total}</p><Sources long={level.stack.rows.map(r=>r.effect)}/></>})}
 for(const [index,key]of abilityKeys.entries()){const value=calculated.abilities[key],modifier=Math.floor((value-10)/2),group=effectGroup(prepared.character,key),stack=stackGroups(group.long,group.short);tiles.push({label:labels[index],value:`${value} (${signed(modifier)})`,detail:<><p>基础／状态设定值 {prepared.character[key]} ＋ 长效 {signed(stack.long)} ＋ 短效 {signed(stack.short)} ＝ {value}</p><p>调整值：FLOOR(({value} − 10) / 2) ＝ {modifier}</p><Sources {...group}/></>})}
 const count=prepared.extras.attackCount;tiles.push({label:'攻击次数',value:calculateAttackCount(prepared.character.class_levels,config,count?.long,count?.short)??'—',detail:<><p>基础次数＝FLOOR((基础命中合计 ＋ 4) / 5)，再计入额外攻击。同一攻击组不重复累加；近战／远程限定次数见武器行。</p><Sources {...count}/></>});
 tiles.push({label:'生命上限',value:hp.total??'—',detail:<><p>职业 {hp.profession??'待配置'} ＋ 体质调整 {hp.modifier} × {d.class_levels.length}级 ＋ 长效 {signed(hp.long)} ＋ 短效 {signed(hp.short)} → {hp.total??'待配置'}</p><Sources long={prepared.character.hp_long_effects} short={prepared.character.hp_short_effects}/></>});
 for(const [key,label]of derivedFields){const value=calculated.values[key],group=effectGroup(prepared.character,key);tiles.push({label,value:value.total??'—',conditions:value.scenarios.map(s=>({label:s.context,value:s.total??'—'})),detail:<>{value.missing.length>0&&<p className="module-error">{value.missing.join('；')}</p>}<ul className="calculation-parts">{value.parts.map((p,i)=><li key={i}>{p.label}<b>{signed(p.value)}</b></li>)}</ul><p>基础合计 {value.base} ＋ 长效 {signed(value.long)} ＋ 短效 {signed(value.short)}；最后向下取整。</p><Sources long={group.long} short={key==='classSkill'||key==='crossSkill'?[]:group.short}/></>})}
 const addGroup=(key:ModuleTarget,label:string,base=0,hideZero=false)=>{const group=prepared.extras[key],stack=stackGroups(group?.long,group?.short),value=Math.floor(base+stack.total);if(hideZero&&value===0)return;tiles.push({label,value,detail:<><p>基础 {base} ＋ 附加 {signed(stack.total)} → {value}</p><Sources {...group}/></>})};
 const resistances=energyResistances.map(([key,label])=>({key,label,group:prepared.extras[key],value:Math.floor(stackGroups(prepared.extras[key]?.long,prepared.extras[key]?.short).total)})).filter(row=>row.value!==0);
 if(resistances.length)tiles.push({label:'能量抗性',value:resistances.map(r=>`${r.label} ${r.value}`).join(' / '),detail:<>{resistances.map(r=><div key={r.key}><b>{r.label} {r.value}</b><Sources {...r.group}/></div>)}</>});
 addGroup('rangedDamageReduction','对远程武器伤害减免',0,true);addGroup('spellDamageReduction','对法术伤害减免',0,true);addGroup('damageReduction','伤害减免');addGroup('damage','通用伤害附加（力量见武器）');
 for(const [key,label]of [['defense','防御'],['touchDefense','接触防御'],['flatDefense','措手不及防御']] as const){const value=defenses[key];tiles.push({label,value:value.total,conditions:value.scenarios.map(s=>({label:s.label,value:s.total})),detail:<><p>基础10 ＋ 敏捷贡献 {value.dex} ＋ 防御来源 {value.stack.total} ＝ {value.total}</p><p>敏捷贡献已考虑盔甲上限及当前状态；情境加值只列在对应情境数值中。</p><Sources long={value.stack.rows.map(r=>r.effect)}/></>})}
 addGroup('initiative','先攻',Math.floor((calculated.abilities.dexterity-10)/2));addGroup('spellResistance','法术抗性');tiles.push({label:'擒抱对抗',value:'—',detail:<p>基础算法尚未配置。</p>});
 const ownSpeed=armorSpeed(state,basics.race?.speed,config,prepared.extras),unit=basics.race?.unit??'尺',mount=resolveConditions(state,config).flags.mounted?selectedMount(d.id,state,roster):undefined;
 tiles.push({label:'移动速度',value:movementDisplay(d.id,state,roster,ownSpeed,unit,config),detail:<>{mount&&<p>上马：当前显示坐骑「{mount.name}」的移动速度。</p>}<p>种族基础速度 {basics.race?.speed??'待配置'}{unit}；本角色经过盔甲、状态倍率与速度加值后的结果为 {ownSpeed??'待配置'}{unit}。</p><Sources long={[...(prepared.extras.speed?.long??[]),...(prepared.extras.speedMultiplier?.long??[]),...(prepared.extras.speedCappedBonus?.long??[])]} short={[...(prepared.extras.speed?.short??[]),...(prepared.extras.speedMultiplier?.short??[]),...(prepared.extras.speedCappedBonus?.short??[])]}/>{stackGroups(prepared.extras.ignoreSwimPenalty?.long,prepared.extras.ignoreSwimPenalty?.short).total>0&&<p>当前忽略游泳状态自身的减速。</p>}</>});
 tiles.push({label:'体型',value:basics.race?.size||'—'},{label:'本职主属性',value:basics.primary.map(p=>`${p.name}·${labels[abilityKeys.indexOf(p.ability as typeof abilityKeys[number])]||'—'}`).join(' / ')||'—'});
 const detail=tiles.find(t=>t.label===selected);
 return <section className="panel final-results" aria-label="最终数值"><h2>{d.name}</h2><div className="final-grid">{tiles.map(tile=><div className="final-tile" key={tile.label}><div className="final-tile-top"><span>{tile.label}</span>{tile.detail?<button type="button" className="calculation-toggle" aria-label={`查看${tile.label}计算详情`} aria-expanded={selected===tile.label} onClick={()=>setSelected(selected===tile.label?null:tile.label)}><output>{tile.value}</output><i aria-hidden="true">{selected===tile.label?'▴':'▾'}</i></button>:<output>{tile.value}</output>}</div>{tile.conditions&&tile.conditions.length>0&&<div className="conditional-values">{tile.conditions.map((s,i)=><small key={i}>{s.label}：{s.value}</small>)}</div>}</div>)}{detail?.detail&&<div className="final-calculation-detail" aria-label={`${detail.label}计算详情`}><div className="list-toolbar"><strong>{detail.label} · 计算详情</strong><button type="button" className="secondary" aria-label="关闭计算详情" onClick={()=>setSelected(null)}>收起</button></div>{detail.detail}</div>}<WeaponDamagePanel embedded state={state} catalog={ruleCatalog(config)} raceSize={basics.race?.size} extras={prepared.extras} character={prepared.character} config={config} effects={prepared.effects}/></div></section>;
}
