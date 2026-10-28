-- Single private campaign. Run once as database administrator.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 role text not null default 'player' check (role in ('gm','player'))
);
create function public.is_member() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid());
$$;
create function public.is_gm() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='gm');
$$;
revoke all on function public.is_member(), public.is_gm() from public;
grant execute on function public.is_member(), public.is_gm() to authenticated;
create table public.characters (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references public.profiles(id) on delete set null,
 name text not null check(length(name) between 1 and 100),
 class_name text not null default '待设定职业',
 level integer not null default 1 check(level between 1 and 100),
 hp integer not null default 10,
 max_hp integer not null default 10 check(max_hp>0),
 ac integer not null default 10 check(ac>=0),
 notes text not null default '',
 resources jsonb not null default '[]'::jsonb check(jsonb_typeof(resources)='array'),
 editable_fields text[] not null default array['hp','notes','resources']::text[] check(editable_fields <@ array['hp','notes','resources']::text[]),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 check(hp>=0 and hp<=max_hp)
);
create index on public.characters(owner_id);
create table public.rules (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 100),
 category text not null default '基础规则', body text not null default '',updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.rules enable row level security;
revoke all on public.profiles,public.characters,public.rules from anon,authenticated;
grant select on public.profiles to authenticated;
grant select,insert,update,delete on public.characters,public.rules to authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_gm());
-- No profile mutation policy: only SQL/admin provisioning may grant roles.
create policy character_read on public.characters for select to authenticated using(public.is_gm() or (public.is_member() and owner_id=auth.uid()));
create policy character_insert on public.characters for insert to authenticated with check(public.is_gm());
create policy character_delete on public.characters for delete to authenticated using(public.is_gm());
create policy character_update on public.characters for update to authenticated using(public.is_gm() or (public.is_member() and owner_id=auth.uid())) with check(public.is_gm() or (public.is_member() and owner_id=auth.uid()));
create policy rules_read on public.rules for select to authenticated using(public.is_member());
create policy rules_insert on public.rules for insert to authenticated with check(public.is_gm());
create policy rules_update on public.rules for update to authenticated using(public.is_gm()) with check(public.is_gm());
create policy rules_delete on public.rules for delete to authenticated using(public.is_gm());
create function public.guard_character() returns trigger language plpgsql set search_path='' as $$
declare resource jsonb; idx integer;
begin
 if TG_OP='UPDATE' then
 if new.version<>old.version+1 then raise exception '角色版本必须递增'; end if;
 if not public.is_gm() then
  if (to_jsonb(new)-array['hp','notes','resources','version','updated_at']) is distinct from (to_jsonb(old)-array['hp','notes','resources','version','updated_at']) then raise exception '此字段由 GM 控制'; end if;
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
create trigger character_guard before insert or update on public.characters for each row execute function public.guard_character();
-- Supabase Postgres Changes obeys table SELECT RLS.
alter publication supabase_realtime add table public.characters,public.rules;
