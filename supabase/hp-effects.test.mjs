import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;create publication supabase_realtime;`);
for(const file of ['001_initial.sql','002_character_basics.sql','003_class_progression.sql','004_mechanics_config.sql','005_simple_hp_custom_classes.sql','006_assign_character.sql','007_hp_effects.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
await db.exec(`insert into auth.users values('${gm}'),('${a}'),('${b}');insert into profiles(id,role) values('${gm}','gm'),('${a}','player'),('${b}','player');insert into characters(id,owner_id,name) values('${a}','${a}','角色A'),('${b}','${b}','角色B');set role authenticated;select set_config('request.jwt.claim.sub','${gm}',false);`);

await db.exec(`update characters set editable_fields=array['hp_short_effects'],version=2 where id='${a}';select set_config('request.jwt.claim.sub','${a}',false);`);
const effects=[5,12,-7].map((value,i)=>({id:String(i),name:'测试'+i,value,enabled:true}));
await db.query('update characters set hp_short_effects=$1,version=3 where id=$2',[JSON.stringify(effects),a]);
assert.deepEqual((await db.query('select hp_short_effects from characters where id=$1',[a])).rows[0].hp_short_effects,effects);
await assert.rejects(db.query('update characters set hp_long_effects=$1,version=4 where id=$2',[JSON.stringify(effects),a]),/长效变量已锁定/);
await assert.rejects(db.query('update characters set hp_short_effects=$1,version=4 where id=$2',[JSON.stringify([{id:'bad',name:'错误',value:'5',enabled:true}]),a]),/来源/);
assert.equal((await db.query('select hp_long_effects from characters where id=$1',[a])).rows[0].hp_long_effects.length,0);
console.log('HP migration, signed effects persistence, player authorization and invalid input checks passed');
await db.close();
