import {scrollProfile,scrollUmdRows} from '../_shared/scrolls.ts';
import {performScrollCast} from '../_shared/resource-engine.ts';
import {auditChanges} from '../_shared/audit.ts';
import {validateMountSelection} from '../_shared/mounts.ts';
import {applyExpiredTimedConditions} from '../_shared/conditions.ts';
import {validateReceivedResources} from '../_shared/grant-resources.ts';
import {canControlCharacter} from '../_shared/character-access.ts';
import {validateSkillState} from '../_shared/skill-engine.ts';
import {buildEffectContext} from '../_shared/shared-effects.ts';
import {performResourceAction,actionPatch,initializeResources,validateResourceState} from '../_shared/resource-engine.ts';
import {validHpEffects} from '../_shared/hp.ts';
import {validateRuleStateChange} from '../_shared/rule-engine.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req:Request)=>{
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const authorization=req.headers.get('Authorization')??'';
 if(!authorization.startsWith('Bearer '))return reply({error:'请先登录'},401);
 async function api(path:string,init:RequestInit={},privileged=false){const res=await fetch(url+path,{...init,headers:{apikey:privileged?service:anon,Authorization:privileged?`Bearer ${service}`:authorization,'Content-Type':'application/json',...init.headers}});const body=await res.json();if(!res.ok)throw Error(body.message??body.error??'保存失败');return body}
 const user=await api('/auth/v1/user');
 const body=await req.json();

 if(body.operation==='scroll_context'){
 const profiles=await api(`/rest/v1/profiles?id=eq.${user.id}&select=role`);if(!profiles[0])return reply({error:'账号未获战役访问权限'},403);
 const [stocks,characters,configs]=await Promise.all([api('/rest/v1/shared_scrolls?id=eq.1&select=items,version'),api('/rest/v1/characters?select=*',{},true),api('/rest/v1/mechanics_config?id=eq.campaign&select=config')]);
 if(!stocks[0]||!configs[0])throw Error('卷轴库尚未初始化');const context=buildEffectContext(characters,configs[0].config);return reply({inventory:stocks[0],umd:scrollUmdRows(characters,configs[0].config,context.incoming)});
 }
 if(body.operation==='scroll_cast'){
 if(typeof body.characterId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.characterId)||!Number.isSafeInteger(body.version)||!Number.isSafeInteger(body.inventoryVersion)||!body.choice||typeof body.choice.moduleId!=='string')throw Error('卷轴施放格式错误');
 const [profiles,characters,configs,stocks]=await Promise.all([api(`/rest/v1/profiles?id=eq.${user.id}&select=role`),api('/rest/v1/characters?select=*',{},true),api('/rest/v1/mechanics_config?id=eq.campaign&select=config'),api('/rest/v1/shared_scrolls?id=eq.1&select=items,version')]);
 const gm=profiles[0]?.role==='gm',c=characters.find((row:{id:string})=>row.id===body.characterId),config=configs[0]?.config,inventory=stocks[0];if(!profiles[0]||!c||c.master_id||!canControlCharacter(c,characters,user.id,gm))return reply({error:'无卷轴使用权限'},403);if(c.version!==body.version||inventory?.version!==body.inventoryVersion)throw Error('角色或卷轴库存已变化，请重试');if(!config||(inventory.items[body.choice.moduleId]??0)<1)throw Error('卷轴已用完或规则未配置');
 const context=buildEffectContext(characters,config),result=performScrollCast(c,config,body.choice,gm,context.roster),profile=scrollProfile(config.modules?.[body.choice.moduleId])!,entry={id:crypto.randomUUID(),time:new Date().toISOString(),text:`使用公共卷轴：${config.modules[body.choice.moduleId].name} · ${profile.ring}环／CL${profile.casterLevel} · 消耗1张${body.choice.targets?.length?' · 目标：'+body.choice.targets.map((id:string)=>context.roster.find(p=>p.id===id)?.name??id).join('、'):''}`},patch={...result,rule_state:{...result.rule_state,auditLog:[...(c.rule_state?.auditLog??[]),entry]}};
 const character=await api('/rest/v1/rpc/commit_scroll_cast',{method:'POST',body:JSON.stringify({p_user_id:user.id,p_character_id:c.id,p_expected_version:body.version,p_inventory_version:body.inventoryVersion,p_module_id:body.choice.moduleId,p_patch:patch})},true);return reply({character});
 }
 if(body.operation==='effect_context'){
  const profiles=await api(`/rest/v1/profiles?id=eq.${user.id}&select=role`);if(!profiles[0])return reply({error:'账号未获战役访问权限'},403);
  const [characters,configs]=await Promise.all([api('/rest/v1/characters?select=*',{},true),api('/rest/v1/mechanics_config?id=eq.campaign&select=config')]);
  if(!configs[0]?.config)throw Error('规则配置不存在');
  const allowed=new Set<string>(characters.filter((c:{id:string;owner_id:string;master_id?:string|null})=>canControlCharacter(c,characters,user.id,profiles[0].role==='gm')).map((c:{id:string})=>c.id));
  return reply(buildEffectContext(characters,configs[0].config,allowed));
 }

 if(typeof body.characterId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.characterId)||!Number.isInteger(body.version)||!body.patch||typeof body.patch!=='object'||Array.isArray(body.patch))throw Error('保存格式错误');
 const allowed=['rule_state','stat_effects','hp_long_effects','hp_short_effects','hp','resources'];if(Object.keys(body.patch).some(k=>!allowed.includes(k)))throw Error('非法保存字段');
 const [profiles,characters,configs]=await Promise.all([api(`/rest/v1/profiles?id=eq.${user.id}&select=role`),api(`/rest/v1/characters?id=eq.${body.characterId}&select=*`),api('/rest/v1/mechanics_config?select=config')]);
 const c=characters[0],gm=profiles[0]?.role==='gm';if(!c)return reply({error:'无编辑权限'},403);
 if(c.version!==body.version)return reply({error:'角色已被更新，请刷新后重试'},409);
 if(!configs[0]?.config)throw Error('规则配置不存在');
 if(!body.patch.rule_state)throw Error('缺少模块状态');body.patch.rule_state=applyExpiredTimedConditions(c.rule_state??{instances:[],weapon:{}},body.patch.rule_state,configs[0].config);
 if(JSON.stringify(body.patch.rule_state.receivedResources??{})!==JSON.stringify(c.rule_state?.receivedResources??{})){const roster=await api('/rest/v1/characters?select=*',{},true);const offers=buildEffectContext(roster,configs[0].config,new Set([c.id])).incoming[c.id]??[];validateReceivedResources(c.rule_state??{instances:[],weapon:{}},body.patch.rule_state,offers,gm)}
 if(JSON.stringify(body.patch.rule_state.skills??{})!==JSON.stringify(c.rule_state?.skills??{})){const roster=await api('/rest/v1/characters?select=*',{},true);const offers=buildEffectContext(roster,configs[0].config,new Set([c.id])).incoming[c.id]??[];validateSkillState({...c,...body.patch},configs[0].config,body.patch.rule_state,offers)}
 if(body.patch.rule_state.conditions?.mounted||body.patch.rule_state.mountId!==undefined){const peers=await api('/rest/v1/characters?select=id,name,master_id',{},true);validateMountSelection(c.id,body.patch.rule_state,peers,configs[0].config)}
 validateRuleStateChange(c,configs[0].config,body.patch.rule_state,gm);
 validateResourceState(c,configs[0].config,body.patch.rule_state,gm);
 if(body.patch.hp!==undefined&&(!Number.isSafeInteger(body.patch.hp)||body.patch.hp!==c.hp&&!gm&&!c.editable_fields.includes('hp')))throw Error('当前生命已锁定或格式错误');
 if(body.patch.resources&&JSON.stringify(body.patch.resources)!==JSON.stringify(c.resources)&&!gm&&!c.editable_fields.includes('resources'))throw Error('资源已锁定');
 for(const key of ['hp_long_effects','hp_short_effects'])if(key in body.patch&&!validHpEffects(body.patch[key]))throw Error('来源格式或加值类别错误');
 if('stat_effects' in body.patch){const groups=body.patch.stat_effects;if(!groups||typeof groups!=='object'||Array.isArray(groups))throw Error('来源集合格式错误');for(const group of Object.values(groups) as {long:unknown;short:unknown}[])if(!group||!validHpEffects(group.long as never)||!validHpEffects(group.short as never))throw Error('来源格式或加值类别错误');}
 let patch={...body.patch,rule_state:initializeResources({...c,...body.patch},configs[0].config,body.patch.rule_state)};if(body.action){if(typeof body.action.instanceId!=='string'||typeof body.action.actionId!=='string'||body.action.event!==undefined&&!['round','battle','cast','spell','day','heal','potential'].includes(body.action.event))throw Error('操作格式错误');const targetRoster=body.action.event==='spell'?(await api('/rest/v1/characters?select=id,name,master_id,rule_state',{},true)).map((row:{id:string;name:string;master_id?:string|null;rule_state?:{team?:string}})=>({id:row.id,name:row.name,master_id:row.master_id,team:row.rule_state?.team??'party'})):[];if(['day','heal'].includes(body.action.event)&&!gm)throw Error('恢复操作仅限DM');const recoveryIncoming=body.action.event==='day'||body.action.event==='heal'?buildEffectContext(await api('/rest/v1/characters?select=*',{},true),configs[0].config,new Set([c.id])).incoming[c.id]??[]:[];patch={...patch,...performResourceAction({...c,...patch},configs[0].config,body.action,gm,targetRoster,recoveryIncoming)}}
 const entries=auditChanges(c,{...c,...patch},configs[0].config,body.action);if(entries.length)patch={...patch,rule_state:{...patch.rule_state,auditLog:[...(c.rule_state?.auditLog??[]),...entries]}};
 const character=await api('/rest/v1/rpc/commit_module_patch',{method:'POST',body:JSON.stringify({p_user_id:user.id,p_character_id:c.id,p_expected_version:body.version,p_patch:patch,p_action_verified:!!body.action})},true);
 return reply({character});
 }catch(e){return reply({error:e instanceof Error?e.message:'保存失败'},400)}
});
