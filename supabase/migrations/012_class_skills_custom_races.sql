begin;
do $$declare definition text; begin
 definition=pg_get_functiondef('public.valid_mechanics(jsonb)'::regprocedure);
 definition=replace(definition,'foreach race_name in array array[''人类'',''强心半身人'',''幼年灰精灵'',''修补匠侏儒''] loop','if not ((value->''races'') ?& array[''人类'',''强心半身人'',''幼年灰精灵'',''修补匠侏儒'']) or (select count(*) from jsonb_object_keys(value->''races''))>200 then return false; end if; for race_name in select jsonb_object_keys(value->''races'') loop if length(btrim(race_name))=0 or length(race_name)>100 then return false; end if;');
 execute definition;
end;$$;
create function public.valid_class_skills(config jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; skill jsonb;
begin
 for item in select value from jsonb_each(config->'classes') loop
  if item ? 'classSkills' then
   if jsonb_typeof(item->'classSkills')<>'array' then return false; end if;
   for skill in select * from jsonb_array_elements(item->'classSkills') loop
    if jsonb_typeof(skill)<>'string' or not ((skill #>> '{}')=any(array['heavy_equipment','siege_weapons','climb','jump','swim','balance','disable_device','open_lock','ride','sleight_of_hand','escape_artist','hide','tumble','use_rope','concentration','accounting','law','alchemy','mathematics','craft_repair','appraise','decipher_documents','search','forgery','knowledge_arcana','knowledge_architecture','knowledge_dungeoneering','knowledge_local','knowledge_nature','knowledge_nobility','knowledge_religion','knowledge_planes','knowledge_geography','knowledge_history','language','spellcraft','hypnosis','art','cooking','navigation','astrology','cipher','heal','sense_motive','listen','spot','survival','military_command','iaijutsu','bluff','handle_animal','intimidate','diplomacy','perform','disguise','use_magic_device','gather_information'])) then return false; end if;
   end loop;
   if jsonb_array_length(item->'classSkills')<>(select count(distinct value) from jsonb_array_elements(item->'classSkills')) then return false; end if;
  end if;
 end loop;
 return true;
exception when others then return false;
end;$$;
alter table public.mechanics_config add constraint valid_class_skill_ids check(public.valid_class_skills(config));
update public.mechanics_config m set config=jsonb_set(m.config,'{classes}',(select jsonb_object_agg(key,case when value ? 'classSkills' then value else value||jsonb_build_object('classSkills',coalesce('{"artificer":["appraise","concentration","craft_repair","disable_device","knowledge_arcana","knowledge_architecture","knowledge_planes","open_lock","art","search","use_magic_device","spellcraft","mathematics","siege_weapons","alchemy"],"crusader":["siege_weapons","navigation","military_command","spot","law","decipher_documents","balance","concentration","craft_repair","diplomacy","intimidate","jump","knowledge_history","knowledge_religion","ride"],"warblade":["balance","climb","concentration","craft_repair","diplomacy","intimidate","jump","knowledge_history","knowledge_local","swim","tumble","heavy_equipment","siege_weapons","iaijutsu"],"cavalier":["heavy_equipment","siege_weapons","navigation","military_command","iaijutsu","climb","craft_repair","handle_animal","intimidate","jump","ride","swim"],"shrine-maiden":["decipher_documents","search","perform","sense_motive","heal","art","craft_repair","spellcraft","knowledge_arcana","knowledge_architecture","knowledge_dungeoneering","knowledge_local","knowledge_nature","knowledge_nobility","knowledge_religion","knowledge_planes","knowledge_geography","knowledge_history"],"cleric":["concentration","art","diplomacy","heal","knowledge_arcana","knowledge_history","knowledge_religion","knowledge_planes","craft_repair","spellcraft","hypnosis","sense_motive","decipher_documents","cipher"]}'::jsonb->key,'[]'::jsonb)) end) from jsonb_each(m.config->'classes'))),version=version+1;
do $$declare definition text; begin
 definition=pg_get_functiondef('public.guard_character()'::regprocedure);
 definition=replace(definition,'if new.race not in ('''',''人类'',''强心半身人'',''幼年灰精灵'',''修补匠侏儒'') then raise exception ''请选择四个已定义种族之一''; end if;','if new.race<>'''' and not exists(select 1 from public.mechanics_config where config->''races'' ? new.race) then raise exception ''未知种族，请先由DM添加并保存''; end if;');
 execute definition;
end;$$;
commit;
