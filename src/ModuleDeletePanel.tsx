import {useState} from 'react';
import type {Mechanics,MechanicsRecord} from './mechanics';
import {moduleDeletionInfo,deleteModuleDefinition,type ModuleUser} from './module-delete';
export function ModuleDeletePanel({record,id,characters,busy,onSave}:{record:MechanicsRecord;id:string;characters:ModuleUser[];busy:boolean;onSave:(c:Mechanics,version:number)=>Promise<void>}){
 const [confirmed,setConfirmed]=useState(false),[message,setMessage]=useState('');const info=moduleDeletionInfo(record.config,id,characters),blocked=!!info.users.length||!!info.references.length;
 return <details className="module-delete-panel"><summary>删除当前规则定义</summary><p><strong>{info.module.name}</strong> · {id}</p>{info.users.length>0?<p>正在使用的角色：{info.users.map(c=>c.name).join('、')}。请先在角色模块分配处移除。</p>:<p>没有角色正在使用。</p>}{info.references.length>0&&<p>引用它的模块：{info.references.map(m=>m.name).join('、')}。请先修改这些引用。</p>}<label><input type="checkbox" checked={confirmed} disabled={busy||blocked} onChange={e=>setConfirmed(e.target.checked)}/>确认从规则库删除此定义</label><button type="button" className="danger" disabled={busy||blocked||!confirmed} onClick={async()=>{try{const next=deleteModuleDefinition(record.config,id,characters);await onSave(next,record.version);setConfirmed(false);setMessage('已提交删除，请查看系统保存提示。')}catch(e){setMessage((e as Error).message)}}}>删除规则定义</button>{message&&<p role="status">{message}</p>}</details>
}
