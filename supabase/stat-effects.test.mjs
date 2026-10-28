import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;create publication supabase_realtime;`);
for(const file of ['001_initial.sql','002_character_basics.sql','003_class_progression.sql','004_mechanics_config.sql','005_simple_hp_custom_classes.sql','006_assign_character.sql','007_hp_effects.sql','008_stat_effects.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
await db.exec(`insert into auth.users values('${gm}'),('${a}'),('${b}');insert into profiles(id,role) values('${gm}','gm'),('${a}','player'),('${b}','player');insert into characters(id,owner_id,name) values('${a}','${a}','角色A'),('${b}','${b}','角色B');set role authenticated;select set_config('request.jwt.claim.sub','${gm}',false);`);


await db.exec(`update characters set ability_permanent=jsonb_set(ability_permanent,'{strength}','2'),editable_fields=array['ability_temporary','derived_long_effects'],version=2 where id='${a}';select set_config('request.jwt.claim.sub','${a}',false);`);
const legacy={id:'legacy-strength-long',name:'原永久调整',value:2,enabled:true};
const short={id:'temp',name:'临时体能',value:1.5,enabled:true};
const groups={strength:{long:[legacy],short:[short]},melee:{long:[{id:'hit',name:'命中长效',value:.6,enabled:true}],short:[]}};
await db.query('update characters set stat_effects=$1,version=3 where id=$2',[JSON.stringify(groups),a]);
assert.deepEqual((await db.query('select stat_effects from characters where id=$1',[a])).rows[0].stat_effects,groups);
await assert.rejects(db.query('update characters set stat_effects=$1,version=4 where id=$2',[JSON.stringify({...groups,strength:{long:[{...legacy,value:99}],short:[short]}}),a]),/长效来源已锁定/);
await assert.rejects(db.query('update characters set stat_effects=$1,version=4 where id=$2',[JSON.stringify({...groups,melee:{long:groups.melee.long,short:[short]}}),a]),/短效来源已锁定/);
await db.exec(`select set_config('request.jwt.claim.sub','${gm}',false);`);
await assert.rejects(db.query('update characters set stat_effects=$1,version=4 where id=$2',[JSON.stringify({...groups,classSkill:{long:[],short:[short]}}),a]),/技能点只有长效/);
await assert.rejects(db.query('update characters set stat_effects=$1,version=4 where id=$2',[JSON.stringify({...groups,strength:{long:[],short:[{...short,value:-99}]}}),a]),/属性总值不能为负/);
console.log('Source persistence, legacy preservation, long/short permissions and no-short-skill checks passed');
await db.close();
