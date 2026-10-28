begin;
alter table public.characters add column race text not null default '' check(length(race)<=100);
alter table public.characters add column class_levels jsonb not null default '[]'::jsonb;
alter table public.characters add column ability_permanent jsonb not null default '{"strength":0,"dexterity":0,"constitution":0,"intelligence":0,"wisdom":0,"charisma":0}'::jsonb;
alter table public.characters add column ability_temporary jsonb not null default '{"strength":0,"dexterity":0,"constitution":0,"intelligence":0,"wisdom":0,"charisma":0}'::jsonb;
alter table public.characters disable trigger character_guard;
update public.characters set class_levels=to_jsonb(array_fill(case class_name when '机关术师' then 'artificer' when '十字军' then 'crusader' when '巫女' then 'shrine-maiden' when '战刃' then 'warblade' when '重骑兵' then 'cavalier' when '牧师' then 'cleric' end,array[level])),version=version+1 where class_name in ('机关术师','十字军','巫女','战刃','重骑兵','牧师');
alter table public.characters enable trigger character_guard;
alter table public.characters drop constraint characters_editable_fields_check;
alter table public.characters add constraint characters_editable_fields_check check(editable_fields <@ array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma','name','race','class_levels','ability_permanent','ability_temporary']::text[]);
create or replace function public.guard_character() returns trigger language plpgsql set search_path='' as $$
declare resource jsonb; idx integer; ability_key text; adjustments jsonb;
begin
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
  if resource not in ('"artificer"'::jsonb,'"crusader"'::jsonb,'"shrine-maiden"'::jsonb,'"warblade"'::jsonb,'"cavalier"'::jsonb,'"cleric"'::jsonb) then raise exception '未知职业'; end if;
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
