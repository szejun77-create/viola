begin;
-- Publish only an invalidation counter, never another character's private state.
create table public.effect_signal(id integer primary key check(id=1),version bigint not null default 1);
insert into public.effect_signal(id) values(1);
alter table public.effect_signal enable row level security;
revoke all on public.effect_signal from public,anon,authenticated;
grant select on public.effect_signal to authenticated;
create policy effect_signal_read on public.effect_signal for select to authenticated using(public.is_member());
create function public.notify_shared_effects() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.effect_signal set version=version+1 where id=1;
 return null;
end;$$;
revoke all on function public.notify_shared_effects() from public,anon,authenticated;
create trigger effect_character_changed after insert or update or delete on public.characters for each statement execute function public.notify_shared_effects();
create trigger effect_config_changed after update on public.mechanics_config for each statement execute function public.notify_shared_effects();
alter publication supabase_realtime add table public.effect_signal;
commit;
