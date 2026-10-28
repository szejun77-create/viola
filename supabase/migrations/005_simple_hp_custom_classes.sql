begin;
alter table public.mechanics_config drop constraint mechanics_config_config_check;
create or replace function public.valid_mechanics(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare class_id text; definition jsonb; race_name text; names text[]='{}'; name_value text;
begin
 if jsonb_typeof(value)<>'object' or value->'schemaVersion' is distinct from '2'::jsonb then return false; end if;
 if jsonb_typeof(value->'classes') is distinct from 'object' or jsonb_typeof(value->'races') is distinct from 'object' then return false; end if;
 if not ((value->'classes') ?& array['artificer','crusader','shrine-maiden','warblade','cavalier','cleric']) or (select count(*) from jsonb_object_keys(value->'classes'))>200 then return false; end if;
 for class_id,definition in select * from jsonb_each(value->'classes') loop
  if class_id !~ '^[a-z][a-z0-9-]{0,79}$' or jsonb_typeof(definition)<>'object' or not (definition ?& array['name','hpPerLevel','primary']) then return false; end if;
  if jsonb_typeof(definition->'name')<>'string' then return false; end if;
  name_value=btrim(definition->>'name');
  if length(name_value)=0 or length(definition->>'name')>100 or name_value=any(names) then return false; end if;
  names=array_append(names,name_value);
  if jsonb_typeof(definition->'primary')<>'string' or definition->>'primary' not in ('','strength','dexterity','constitution','intelligence','wisdom','charisma') then return false; end if;
  if jsonb_typeof(definition->'hpPerLevel') not in ('null','number') then return false; end if;
  if jsonb_typeof(definition->'hpPerLevel')='number' and (definition->>'hpPerLevel')::numeric<0 then return false; end if;
 end loop;
 foreach race_name in array array['人类','强心半身人','幼年灰精灵','修补匠侏儒'] loop
  definition=value->'races'->race_name;
  if definition is null or not (definition ?& array['size','speed','unit']) then return false; end if;
  if jsonb_typeof(definition->'size')<>'string' or length(definition->>'size')>100 or jsonb_typeof(definition->'unit')<>'string' or length(definition->>'unit') not between 1 and 20 then return false; end if;
  if jsonb_typeof(definition->'speed') not in ('null','number') then return false; end if;
  if jsonb_typeof(definition->'speed')='number' and (definition->>'speed')::numeric<0 then return false; end if;
 end loop;
 return true;
exception when others then return false;
end;
$$;
-- Preserve all old table values. A cumulative table cannot be safely guessed into one HP value.
update public.mechanics_config set config=jsonb_set(jsonb_set(config,'{schemaVersion}','2'),'{classes}',(select jsonb_object_agg(key,value||jsonb_build_object('hpPerLevel',null,'name',case key when 'artificer' then '机关术师' when 'crusader' then '十字军' when 'shrine-maiden' then '巫女' when 'warblade' then '战刃' when 'cavalier' then '重骑兵' when 'cleric' then '牧师' else key end)) from jsonb_each(config->'classes'))),version=version+1;
alter table public.mechanics_config add constraint mechanics_config_config_check check(public.valid_mechanics(config) is true);
create or replace function public.guard_mechanics() returns trigger language plpgsql set search_path='' as $$
begin
 if new.version<>old.version+1 then raise exception '规则版本必须递增'; end if;
 if exists(select 1 from jsonb_object_keys(old.config->'classes') as old_id where not ((new.config->'classes') ? old_id)) then raise exception '不能移除已有职业，以免破坏角色记录'; end if;
 new.updated_at=now();return new;
end;
$$;
create or replace function public.guard_character() returns trigger language plpgsql set search_path='' as $$
declare resource jsonb; idx integer; ability_key text; adjustments jsonb;
begin
 if TG_OP='INSERT' or new.race is distinct from old.race then
  if new.race not in ('','人类','强心半身人','幼年灰精灵','修补匠侏儒') then raise exception '请选择四个已定义种族之一'; end if;
 end if;
 if TG_OP='UPDATE' then
 if new.version<>old.version+1 then raise exception '角色版本必须递增'; end if;
 if not public.is_gm() then
  if (to_jsonb(new)-array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma','name','race','class_levels','ability_permanent','ability_temporary','version','updated_at']) is distinct from (to_jsonb(old)-array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma','name','race','class_levels','ability_permanent','ability_temporary','version','updated_at']) then raise exception '此字段由 GM 控制'; end if;
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
  if (to_jsonb(new)->>ability_key)::numeric+(new.ability_permanent->>ability_key)::numeric+(new.ability_temporary->>ability_key)::numeric<0 then raise exception '属性总值不能为负'; end if;
 end loop;

 new.updated_at=now(); return new;
end;
$$;



commit;
