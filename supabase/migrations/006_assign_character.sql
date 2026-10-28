-- Existing owner_id and RLS continue to enforce access. One dropdown choice per player.
begin;
create function public.assign_character(p_account_id uuid,p_character_id uuid,p_expected_version integer default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_gm() then raise exception '只有 GM 可以分配角色' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(20261021,1);
 if not exists(select 1 from public.profiles where id=p_account_id and role='player') then raise exception '玩家账号不存在'; end if;
 if p_character_id is not null then
  if not exists(select 1 from public.characters where id=p_character_id and version=p_expected_version) then raise exception '角色已更新或不存在，请刷新后重试'; end if;
 end if;
 update public.characters set owner_id=case when id=p_character_id then p_account_id else null end,version=version+1
 where owner_id=p_account_id or id=p_character_id;
end;
$$;
revoke all on function public.assign_character(uuid,uuid,integer) from public;
grant execute on function public.assign_character(uuid,uuid,integer) to authenticated;
commit;
