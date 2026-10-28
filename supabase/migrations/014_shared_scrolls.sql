begin;
create function public.valid_scroll_items(items jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare entry record;begin
 if jsonb_typeof(items)<>'object' or (select count(*) from jsonb_object_keys(items))>5000 then return false;end if;
 for entry in select * from jsonb_each(items) loop
  if entry.key='' or jsonb_typeof(entry.value)<>'number' then return false;end if;
  if (entry.value::text)::numeric<0 or (entry.value::text)::numeric>1000000 or trunc((entry.value::text)::numeric)<>(entry.value::text)::numeric then return false;end if;
 end loop;return true;end;$$;
create table public.shared_scrolls(id integer primary key check(id=1),items jsonb not null default '{}'::jsonb check(public.valid_scroll_items(items)),version integer not null default 1 check(version>0));
insert into public.shared_scrolls(id)values(1);
alter table public.shared_scrolls enable row level security;
revoke all on public.shared_scrolls from public,anon,authenticated;
grant select,update on public.shared_scrolls to authenticated;
create policy shared_scrolls_read on public.shared_scrolls for select to authenticated using(public.is_member());
create policy shared_scrolls_gm_update on public.shared_scrolls for update to authenticated using(public.is_gm()) with check(public.is_gm());
create trigger shared_scrolls_changed after update on public.shared_scrolls for each statement execute function public.notify_shared_effects();
alter publication supabase_realtime add table public.shared_scrolls;
-- Inventory consumption and validated character effects commit together; no client can call this directly.
create function public.commit_scroll_cast(p_user_id uuid,p_character_id uuid,p_expected_version integer,p_inventory_version integer,p_module_id text,p_patch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare stock public.shared_scrolls;result jsonb;quantity integer;
begin
 select * into stock from public.shared_scrolls where id=1 for update;
 if stock.version<>p_inventory_version then raise exception '卷轴库存已变化，请重试';end if;
 quantity=coalesce((stock.items->>p_module_id)::integer,0);
 if quantity<1 then raise exception '卷轴已用完';end if;
 result=public.commit_module_patch(p_user_id,p_character_id,p_expected_version,p_patch,true);
 update public.shared_scrolls set items=jsonb_set(items,array[p_module_id],to_jsonb(quantity-1)),version=version+1 where id=1;
 return result;
end;$$;
revoke all on function public.commit_scroll_cast(uuid,uuid,integer,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_scroll_cast(uuid,uuid,integer,integer,text,jsonb) to service_role;
commit;
