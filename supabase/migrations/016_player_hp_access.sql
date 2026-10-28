begin;
-- Existing imported cards may predate player HP editing. Change only the
-- HP field permission; ownership and other field locks remain unchanged.
alter table public.characters disable trigger character_guard;
update public.characters set editable_fields=array_append(editable_fields,'hp'),version=version+1
where not ('hp'=any(editable_fields));
alter table public.characters enable trigger character_guard;
commit;
