begin;
alter table public.characters add column master_id uuid references public.characters(id) on delete set null;
alter table public.characters add constraint character_not_own_master check(master_id is distinct from id);
create index on public.characters(master_id);
-- Security definer avoids recursive RLS reads of the same table.
create function public.controls_character(p_character_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_member() and exists(
  select 1 from public.characters c left join public.characters m on m.id=c.master_id
  where c.id=p_character_id and
   (case when c.master_id is null then c.owner_id=auth.uid()
    else m.master_id is null and m.owner_id=auth.uid() end)
 );
$$;
revoke all on function public.controls_character(uuid) from public;
grant execute on function public.controls_character(uuid) to authenticated,service_role;
drop policy character_read on public.characters;
drop policy character_update on public.characters;
create policy character_read on public.characters for select to authenticated
 using(public.is_gm() or public.controls_character(id));
create policy character_update on public.characters for update to authenticated
 using(public.is_gm() or public.controls_character(id))
 with check(public.is_gm() or public.controls_character(id));
-- The existing guard already treats master_id and owner_id as GM-only fields.
create function public.guard_master_link() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.master_id is not distinct from old.master_id and new.owner_id is not distinct from old.owner_id then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(20261025,1);
 if new.master_id is not null then
  if new.owner_id is not null then raise exception '从属由主人账号控制，不能直接分配账号'; end if;
  if new.master_id=new.id then raise exception '角色不能成为自己的主人'; end if;
  if not exists(select 1 from public.characters where id=new.master_id and master_id is null) then raise exception '请选择独立角色作为主人'; end if;
  if exists(select 1 from public.characters where master_id=new.id) then raise exception '此角色已有从属，请先解除其从属关联'; end if;
 end if;
 return new;
end;$$;
create trigger master_link_guard before insert or update on public.characters for each row execute function public.guard_master_link();
create function public.unlink_companions() returns trigger language plpgsql set search_path='' as $$
begin
 update public.characters set master_id=null,owner_id=null,version=version+1 where master_id=old.id;
 return old;
end;$$;
create trigger companion_unlink before delete on public.characters for each row execute function public.unlink_companions();
-- Keep existing validated module commit, widening only the ownership predicate.
do $$declare definition text; begin
 definition=pg_get_functiondef('public.commit_module_patch(uuid,uuid,integer,jsonb,boolean)'::regprocedure);
 if position('c.owner_id=p_user_id or public.is_gm()' in definition)=0 then raise exception 'Unexpected module commit definition'; end if;
 definition=replace(definition,'c.owner_id=p_user_id or public.is_gm()','public.controls_character(c.id) or public.is_gm()');
 execute definition;
end;$$;
commit;
