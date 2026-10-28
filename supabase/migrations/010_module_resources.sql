begin;
-- Current HP may be negative; its maximum is calculated by the shared engine.
do $$declare item record; definition text; begin
 for item in select conname from pg_constraint where conrelid='public.characters'::regclass and contype='c' and pg_get_constraintdef(oid) like '%hp >= 0%' loop
  execute format('alter table public.characters drop constraint %I',item.conname);
 end loop;
 definition=pg_get_functiondef('public.guard_character()'::regprocedure);
 definition=replace(definition,'if new.hp is distinct from old.hp and not (''hp''=any(old.editable_fields)) then','if new.hp is distinct from old.hp and not (''hp''=any(old.editable_fields)) and not (current_user in (''postgres'',''service_role'') and current_setting(''app.resource_action'',true)=''verified'') then');
 execute definition;
end;$$;
drop function public.commit_module_patch(uuid,uuid,integer,jsonb);
create function public.commit_module_patch(p_user_id uuid,p_character_id uuid,p_expected_version integer,p_patch jsonb,p_action_verified boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('rule_state','stat_effects','hp_long_effects','hp_short_effects','hp','resources')) then raise exception '非法保存字段'; end if;
 perform set_config('app.resource_action',case when p_action_verified then 'verified' else '' end,true);
 perform set_config('request.jwt.claim.sub',p_user_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_user_id)::text,true);
 if not exists(select 1 from public.profiles where id=p_user_id) then raise exception '账号不存在'; end if;
 update public.characters c set
 rule_state=case when p_patch ? 'rule_state' then p_patch->'rule_state' else c.rule_state end,
 stat_effects=case when p_patch ? 'stat_effects' then p_patch->'stat_effects' else c.stat_effects end,
 hp_long_effects=case when p_patch ? 'hp_long_effects' then p_patch->'hp_long_effects' else c.hp_long_effects end,
 hp_short_effects=case when p_patch ? 'hp_short_effects' then p_patch->'hp_short_effects' else c.hp_short_effects end,
 hp=case when p_patch ? 'hp' then (p_patch->>'hp')::integer else c.hp end,
 resources=case when p_patch ? 'resources' then p_patch->'resources' else c.resources end,
 version=c.version+1
 where c.id=p_character_id and c.version=p_expected_version and (c.owner_id=p_user_id or public.is_gm())
 returning to_jsonb(c) into result;
 if result is null then raise exception '角色已更新或无编辑权限'; end if;
 return result;
end;$$;
revoke all on function public.commit_module_patch(uuid,uuid,integer,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.commit_module_patch(uuid,uuid,integer,jsonb,boolean) to service_role;
commit;
