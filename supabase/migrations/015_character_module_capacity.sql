begin;
-- Match the existing runtime limit of 1000 module instances per character.
alter table public.characters drop constraint valid_rule_state;
alter table public.characters add constraint valid_rule_state check(
 jsonb_typeof(rule_state)='object'
 and jsonb_typeof(rule_state->'instances')='array'
 and jsonb_typeof(rule_state->'weapon')='object'
 and jsonb_array_length(rule_state->'instances')<=1000
);
commit;
