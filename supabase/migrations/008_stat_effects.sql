begin;
alter table public.characters add column stat_effects jsonb not null default '{}'::jsonb;
alter table public.characters drop constraint characters_editable_fields_check;
alter table public.characters add constraint characters_editable_fields_check check(editable_fields <@ array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma','name','race','class_levels','ability_permanent','ability_temporary','hp_long_effects','hp_short_effects','derived_long_effects','derived_short_effects']::text[]);
create function public.stat_effect_group(p_character jsonb,p_key text) returns jsonb language plpgsql immutable set search_path='' as $$
declare long_value numeric; short_value numeric;
begin
 if (p_character->'stat_effects') ? p_key then return p_character->'stat_effects'->p_key; end if;
 if p_key=any(array['strength','dexterity','constitution','intelligence','wisdom','charisma']) then
  long_value=coalesce((p_character->'ability_permanent'->>p_key)::numeric,0);
  short_value=coalesce((p_character->'ability_temporary'->>p_key)::numeric,0);
  return jsonb_build_object('long',case when long_value=0 then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id','legacy-'||p_key||'-long','name','原永久调整','value',long_value,'enabled',true)) end,'short',case when short_value=0 then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id','legacy-'||p_key||'-short','name','原临时调整','value',short_value,'enabled',true)) end);
 end if;
 return '{"long":[],"short":[]}'::jsonb;
end;
$$;
create or replace function public.guard_character() returns trigger language plpgsql set search_path='' as $$
declare resource jsonb; idx integer; ability_key text; adjustments jsonb; effect_group jsonb; stat_key text; new_group jsonb; old_group jsonb; long_permission text; short_permission text; actual_total numeric;
begin
 if TG_OP='INSERT' or new.race is distinct from old.race then
  if new.race not in ('','人类','强心半身人','幼年灰精灵','修补匠侏儒') then raise exception '请选择四个已定义种族之一'; end if;
 end if;
 if TG_OP='UPDATE' then
 if new.version<>old.version+1 then raise exception '角色版本必须递增'; end if;
 if not public.is_gm() then
  if (to_jsonb(new)-array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma','name','race','class_levels','ability_permanent','ability_temporary','hp_long_effects','hp_short_effects','stat_effects','version','updated_at']) is distinct from (to_jsonb(old)-array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma','name','race','class_levels','ability_permanent','ability_temporary','hp_long_effects','hp_short_effects','stat_effects','version','updated_at']) then raise exception '此字段由 GM 控制'; end if;

  foreach stat_key in array array['strength','dexterity','constitution','intelligence','wisdom','charisma','melee','ranged','fortitude','reflex','will','classSkill','crossSkill'] loop
   new_group=public.stat_effect_group(to_jsonb(new),stat_key);old_group=public.stat_effect_group(to_jsonb(old),stat_key);
   if stat_key=any(array['strength','dexterity','constitution','intelligence','wisdom','charisma']) then long_permission='ability_permanent';short_permission='ability_temporary';else long_permission='derived_long_effects';short_permission='derived_short_effects';end if;
   if new_group->'long' is distinct from old_group->'long' and not (long_permission=any(old.editable_fields)) then raise exception '该项目长效来源已锁定'; end if;
   if new_group->'short' is distinct from old_group->'short' and not (short_permission=any(old.editable_fields)) then raise exception '该项目短效来源已锁定'; end if;
  end loop;

  if new.hp_long_effects is distinct from old.hp_long_effects and not ('hp_long_effects'=any(old.editable_fields)) then raise exception 'HP 长效变量已锁定'; end if;
  if new.hp_short_effects is distinct from old.hp_short_effects and not ('hp_short_effects'=any(old.editable_fields)) then raise exception 'HP 短效变量已锁定'; end if;
  if new.name is distinct from old.name and not ('name'=any(old.editable_fields)) then raise exception '姓名已锁定'; end if;
  if new.race is distinct from old.race and not ('race'=any(old.editable_fields)) then raise exception '种族已锁定'; end if;
  if new.class_levels is distinct from old.class_levels and not ('class_levels'=any(old.editable_fields)) then raise exception '职业等级已锁定'; end if;
  if new.ability_permanent is distinct from old.ability_permanent and not ('ability_permanent'=any(old.editable_fields)) then raise exception '永久属性已锁定'; end if;
  if new.ability_temporary is distinct from old.ability_temporary and not ('ability_temporary'=any(old.editable_fields)) then raise exception '临时属性已锁定'; end if;
  if new.class_name is distinct from old.class_name and not ('class_name'=any(old.editable_fields)) then raise exception '职业已锁定'; end if;
  if new.strength is distinct from old.strength and not ('strength'=any(old.editable_fields)) then raise exception '力量已锁定'; end if;
  if new.dexterity is distinct from old.dexterity and not ('dexterity'=any(old.editable_fields)) then raise exception '敏捷已锁定'; end if;
  if new.constitution is distinct from old.constitution and not ('constitution'=any(old.editable_fields)) then raise exception '体质已锁定'; end if;
  if new.intelligence is distinct from old.intelligence and not ('intelligence'=any(old.editable_fields)) then raise exception '智力已锁定'; end if;
  if new.wisdom is distinct from old.wisdom and not ('wisdom'=any(old.editable_fields)) then raise exception '感知已锁定'; end if;
  if new.charisma is distinct from old.charisma and not ('charisma'=any(old.editable_fields)) then raise exception '魅力已锁定'; end if;
  if new.hp is distinct from old.hp and not ('hp'=any(old.editable_fields)) then raise exception '生命值已锁定'; end if;
  if new.notes is distinct from old.notes and not ('notes'=any(old.editable_fields)) then raise exception '笔记已锁定'; end if;
  if new.resources is distinct from old.resources then
   if not ('resources'=any(old.editable_fields)) then raise exception '资源已锁定'; end if;
   if jsonb_array_length(new.resources)<>jsonb_array_length(old.resources) then raise exception '仅 GM 可增删资源'; end if;
   if jsonb_array_length(new.resources)>0 then
    for idx in 0..jsonb_array_length(new.resources)-1 loop
     if ((new.resources->idx)-'current') is distinct from ((old.resources->idx)-'current') then raise exception '仅 GM 可修改资源定义与上限'; end if;
    end loop;
   end if;
  end if;
 end if;
 end if;
 for resource in select * from jsonb_array_elements(new.resources) loop
  if jsonb_typeof(resource)<>'object' or not (resource ?& array['name','current','max']) or jsonb_typeof(resource->'name')<>'string' or jsonb_typeof(resource->'current')<>'number' or jsonb_typeof(resource->'max')<>'number' then raise exception '无效资源格式'; end if;
  if (resource->>'current')::numeric<0 or (resource->>'max')::numeric<0 or (resource->>'current')::numeric>(resource->>'max')::numeric then raise exception '资源值超出范围'; end if;
 end loop;

 if jsonb_typeof(new.class_levels)<>'array' or jsonb_array_length(new.class_levels)>100 then raise exception '职业等级格式错误或超过100级'; end if;
 for resource in select * from jsonb_array_elements(new.class_levels) loop
  if jsonb_typeof(resource)<>'string' or not exists(select 1 from public.mechanics_config where config->'classes' ? (resource #>> '{}')) then raise exception '未知职业，请先由 DM 添加并保存'; end if;
 end loop;
 foreach adjustments in array array[new.ability_permanent,new.ability_temporary] loop
  if jsonb_typeof(adjustments)<>'object' then raise exception '属性来源必须为对象'; end if;
  if (select count(*) from jsonb_object_keys(adjustments))<>6 then raise exception '必须包含六大属性'; end if;
  foreach ability_key in array array['strength','dexterity','constitution','intelligence','wisdom','charisma'] loop
   if not (adjustments ? ability_key) or jsonb_typeof(adjustments->ability_key)<>'number' then raise exception '属性调整必须为整数'; end if;
   if (adjustments->>ability_key)::numeric<>trunc((adjustments->>ability_key)::numeric) then raise exception '属性调整必须为整数'; end if;
  end loop;
 end loop;
 foreach ability_key in array array['strength','dexterity','constitution','intelligence','wisdom','charisma'] loop
  new_group=public.stat_effect_group(to_jsonb(new),ability_key);
  actual_total=(to_jsonb(new)->>ability_key)::numeric+coalesce((select sum((e->>'value')::numeric) from jsonb_array_elements(new_group->'long') as e where (e->>'enabled')::boolean),0)+coalesce((select sum((e->>'value')::numeric) from jsonb_array_elements(new_group->'short') as e where (e->>'enabled')::boolean),0);
  if floor(actual_total)<0 then raise exception '属性总值不能为负'; end if;
 end loop;


 foreach effect_group in array array[new.hp_long_effects,new.hp_short_effects] loop
  if jsonb_typeof(effect_group)<>'array' then raise exception 'HP 来源必须是列表'; end if;
  for resource in select * from jsonb_array_elements(effect_group) loop
   if jsonb_typeof(resource)<>'object' or not (resource ?& array['id','name','value','enabled']) then raise exception 'HP 来源格式错误'; end if;
   if jsonb_typeof(resource->'id')<>'string' or length(resource->>'id')=0 or jsonb_typeof(resource->'name')<>'string' or length(btrim(resource->>'name'))=0 or length(resource->>'name')>100 or jsonb_typeof(resource->'value')<>'number' or jsonb_typeof(resource->'enabled')<>'boolean' then raise exception 'HP 来源名称、数值或生效状态错误'; end if;
  end loop;
 end loop;


 if jsonb_typeof(new.stat_effects)<>'object' then raise exception '来源集合必须为对象'; end if;
 for stat_key,new_group in select * from jsonb_each(new.stat_effects) loop
  if not (stat_key=any(array['strength','dexterity','constitution','intelligence','wisdom','charisma','melee','ranged','fortitude','reflex','will','classSkill','crossSkill'])) or jsonb_typeof(new_group)<>'object' or not (new_group ?& array['long','short']) then raise exception '来源项目格式错误'; end if;
  if jsonb_typeof(new_group->'long')<>'array' or jsonb_typeof(new_group->'short')<>'array' then raise exception '来源明细必须为列表'; end if;
  if stat_key in ('classSkill','crossSkill') and jsonb_array_length(new_group->'short')<>0 then raise exception '技能点只有长效变量'; end if;
  foreach effect_group in array array[new_group->'long',new_group->'short'] loop
   for resource in select * from jsonb_array_elements(effect_group) loop
    if jsonb_typeof(resource)<>'object' or not(resource ?& array['id','name','value','enabled']) then raise exception '来源明细格式错误'; end if;
    if jsonb_typeof(resource->'id')<>'string' or length(resource->>'id')=0 or jsonb_typeof(resource->'name')<>'string' or length(btrim(resource->>'name'))=0 or length(resource->>'name')>100 or jsonb_typeof(resource->'value')<>'number' or jsonb_typeof(resource->'enabled')<>'boolean' then raise exception '来源名称、数值或生效状态错误'; end if;
   end loop;
  end loop;
 end loop;

 new.updated_at=now(); return new;
end;
$$;





commit;
