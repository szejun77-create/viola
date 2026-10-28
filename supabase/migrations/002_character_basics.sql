-- Apply after 001. Existing scores default to 10 as placeholders.
alter table public.characters add column strength integer not null default 10 check (strength>=0);
alter table public.characters add column dexterity integer not null default 10 check (dexterity>=0);
alter table public.characters add column constitution integer not null default 10 check (constitution>=0);
alter table public.characters add column intelligence integer not null default 10 check (intelligence>=0);
alter table public.characters add column wisdom integer not null default 10 check (wisdom>=0);
alter table public.characters add column charisma integer not null default 10 check (charisma>=0);
alter table public.characters drop constraint characters_editable_fields_check;
alter table public.characters add constraint characters_editable_fields_check check (editable_fields <@ array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma']::text[]);
create or replace function public.guard_character() returns trigger language plpgsql set search_path='' as $$
declare resource jsonb; idx integer;
begin
 if TG_OP='UPDATE' then
 if new.version<>old.version+1 then raise exception '角色版本必须递增'; end if;
 if not public.is_gm() then
  if (to_jsonb(new)-array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma','version','updated_at']) is distinct from (to_jsonb(old)-array['hp','notes','resources','class_name','strength','dexterity','constitution','intelligence','wisdom','charisma','version','updated_at']) then raise exception '此字段由 GM 控制'; end if;
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
 new.updated_at=now(); return new;
end;
$$;
