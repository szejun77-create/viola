import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;create publication supabase_realtime;`);
const sql=readFileSync('supabase/migrations/001_initial.sql','utf8');await db.exec(sql);await db.exec(readFileSync('supabase/migrations/002_character_basics.sql','utf8'));
const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
await db.exec(`insert into auth.users values('${gm}'),('${a}'),('${b}');insert into profiles(id,role) values('${gm}','gm'),('${a}','player'),('${b}','player');insert into characters(id,owner_id,name,resources) values('${a}','${a}','A','[{"name":"fire","current":2,"max":3}]'),('${b}','${b}','B','[]');`);
await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`);
let count=0;
async function pass(name,fn){await fn();count++;console.log('PASS',name)}
async function deny(sql){await db.exec('begin');try{await db.exec(sql);await db.exec('rollback');throw Error('Expected rejection')}catch(e){await db.exec('rollback');if(e.message==='Expected rejection')throw e}}
await pass('player sees only own character',async()=>{const r=await db.query('select name from characters');if(r.rows.length!==1||r.rows[0].name!=='A')throw Error('RLS visibility')});
await pass('player can update authorized hp',()=>db.exec(`update characters set hp=9,version=2 where id='${a}'`));
await pass('player cannot change GM field',()=>deny(`update characters set ac=99,version=3 where id='${a}'`));
await pass('player cannot take ownership',()=>deny(`update characters set owner_id='${b}',version=3 where id='${a}'`));
await pass('player cannot change resource max',()=>deny(`update characters set resources='[{"name":"fire","current":2,"max":99}]',version=3 where id='${a}'`));
await pass('player can spend resource',()=>db.exec(`update characters set resources='[{"name":"fire","current":1,"max":3}]',version=3 where id='${a}'`));
await pass('player cannot grant GM',()=>deny(`update profiles set role='gm' where id='${a}'`));
await pass('player cannot publish rule',()=>deny(`insert into rules(title) values('x')`));
await pass('stale version changes no rows',async()=>{const r=await db.query(`update characters set hp=8,version=3 where id='${a}' and version=2 returning id`);if(r.rows.length)throw Error('lost update')});
await db.exec(`select set_config('request.jwt.claim.sub','${gm}',false);`);
await pass('GM sees both characters',async()=>{const r=await db.query('select * from characters');if(r.rows.length!==2)throw Error('GM visibility')});
await pass('GM can lock fields',()=>db.exec(`update characters set editable_fields='{}',version=4 where id='${a}'`));
await db.exec(`select set_config('request.jwt.claim.sub','${a}',false);`);
await pass('database enforces GM lock',()=>deny(`update characters set hp=8,version=5 where id='${a}'`));

await pass('base scores default to ten',async()=>{const r=await db.query('select strength,charisma from characters');if(r.rows.some(x=>x.strength!==10||x.charisma!==10))throw Error('default scores')});
await pass('locked strength is rejected',()=>deny(`update characters set strength=16,version=5 where id='${a}'`));
await pass('locked class is rejected',()=>deny(`update characters set class_name='wizard',version=5 where id='${a}'`));
await db.exec(`select set_config('request.jwt.claim.sub','${gm}',false);update characters set editable_fields=array['strength','class_name'],version=5 where id='${a}';select set_config('request.jwt.claim.sub','${a}',false);`);
await pass('authorized player edits strength and class',()=>db.exec(`update characters set strength=16,class_name='测试职业',version=6 where id='${a}'`));
await pass('negative ability rejected',()=>deny(`update characters set strength=-1,version=7 where id='${a}'`));
await pass('other abilities remain locked',()=>deny(`update characters set wisdom=18,version=7 where id='${a}'`));


await db.exec('reset role');await db.exec(`insert into characters(name,class_name,level) values('迁移测试','牧师',3);`);await db.exec(readFileSync('supabase/migrations/003_class_progression.sql','utf8'));
await pass('existing class migrates with original level',async()=>{const r=await db.query("select class_levels,hp,notes from characters where name='迁移测试'");if(JSON.stringify(r.rows[0].class_levels)!==JSON.stringify(['cleric','cleric','cleric'])||r.rows[0].hp!==10)throw Error('migration lost data')});
await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${gm}',false);`);
await pass('GM records exact multiclass sequence',()=>db.exec(`update characters set class_levels='["crusader","crusader","crusader","crusader","crusader","warblade","warblade","warblade","crusader"]',race='人类',version=7 where id='${a}'`));
await pass('unknown class rejected',()=>deny(`update characters set class_levels='["wizard"]',version=8 where id='${a}'`));
await pass('malformed class sequence rejected',()=>deny(`update characters set class_levels='{}',version=8 where id='${a}'`));
await pass('negative temporary adjustment allowed',()=>db.exec(`update characters set ability_temporary=jsonb_set(ability_temporary,'{strength}','-2'),version=8 where id='${a}'`));
await pass('fractional adjustment rejected',()=>deny(`update characters set ability_temporary=jsonb_set(ability_temporary,'{strength}','1.5'),version=9 where id='${a}'`));
await pass('missing ability key rejected',()=>deny(`update characters set ability_permanent='{}',version=9 where id='${a}'`));
await pass('negative ability total rejected',()=>deny(`update characters set ability_temporary=jsonb_set(ability_temporary,'{strength}','-99'),version=9 where id='${a}'`));
await db.exec(`update characters set editable_fields=array['ability_temporary'],version=9 where id='${a}';select set_config('request.jwt.claim.sub','${a}',false);`);
await pass('locked innate strength rejected',()=>deny(`update characters set strength=30,version=10 where id='${a}'`));
await pass('locked permanent bonus rejected',()=>deny(`update characters set ability_permanent=jsonb_set(ability_permanent,'{strength}','5'),version=10 where id='${a}'`));
await pass('locked class sequence rejected',()=>deny(`update characters set class_levels='["cleric"]',version=10 where id='${a}'`));
await pass('authorized temporary bonus allowed',()=>db.exec(`update characters set ability_temporary=jsonb_set(ability_temporary,'{strength}','2'),version=10 where id='${a}'`));
await db.exec(`select set_config('request.jwt.claim.sub','${gm}',false);update characters set editable_fields=array['name','race','class_levels'],version=11 where id='${a}';select set_config('request.jwt.claim.sub','${a}',false);`);
await pass('authorized identity and class editing allowed',()=>db.exec(`update characters set name='角色A',race='测试种族',class_levels='["cleric","crusader"]',version=12 where id='${a}'`));


await db.exec('reset role');await db.exec(readFileSync('supabase/migrations/004_mechanics_config.sql','utf8'));
await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${gm}',false);`);
await pass('DM reads initial blank mechanics',async()=>{const r=await db.query("select config,version from mechanics_config");if(r.rows.length!==1||r.rows[0].config.classes.crusader.levels[0].hp!==null)throw Error('defaults')});
await pass('DM updates growth rule',()=>db.exec(`update mechanics_config set config=jsonb_set(config,'{classes,crusader,levels,0,hp}','12'),version=2 where id='campaign'`));
await pass('negative growth rejected',()=>deny(`update mechanics_config set config=jsonb_set(config,'{classes,crusader,levels,0,hp}','-1'),version=3 where id='campaign'`));
await pass('invalid mechanics structure rejected',()=>deny(`update mechanics_config set config='{}',version=3 where id='campaign'`));
await pass('stale rule version changes no rows',async()=>{const r=await db.query(`update mechanics_config set version=2 where version=1 returning id`);if(r.rows.length)throw Error('stale config')});
await pass('DM can choose supported race',()=>db.exec(`update characters set race='强心半身人',version=13 where id='${a}'`));
await pass('unknown new race rejected',()=>deny(`update characters set race='自定义未知',version=14 where id='${a}'`));
await db.exec(`select set_config('request.jwt.claim.sub','${a}',false);`);
await pass('player reads shared mechanics',async()=>{const r=await db.query('select config from mechanics_config');if(r.rows.length!==1)throw Error('shared rules invisible')});
await pass('player rule mutation affects no rows',async()=>{const r=await db.query(`update mechanics_config set config=jsonb_set(config,'{classes,crusader,levels,0,hp}','999'),version=3 returning id`);if(r.rows.length)throw Error('player edited rules')});
await pass('player cannot insert rules',()=>deny(`insert into mechanics_config(id,config) select id,config from mechanics_config`));
await db.exec(`select set_config('request.jwt.claim.sub','',false);`);

await db.exec('reset role');await db.exec(readFileSync('supabase/migrations/005_simple_hp_custom_classes.sql','utf8'));
await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${gm}',false);`);
await pass('upgrade preserves old table without guessing per-level HP',async()=>{const r=await db.query('select config from mechanics_config');if(r.rows[0].config.schemaVersion!==2||r.rows[0].config.classes.crusader.hpPerLevel!==null||r.rows[0].config.classes.crusader.levels[0].hp!==12)throw Error('upgrade lost data')});
await pass('DM saves one HP value per class',()=>db.exec(`update mechanics_config set config=jsonb_set(config,'{classes,crusader,hpPerLevel}','10'),version=4 where id='campaign'`));
await pass('negative per-level HP rejected',()=>deny(`update mechanics_config set config=jsonb_set(config,'{classes,crusader,hpPerLevel}','-1'),version=5 where id='campaign'`));
await pass('DM adds new class definition',()=>db.exec(`update mechanics_config set config=jsonb_set(config,'{classes,custom-test}','{"name":"新增测试职业","hpPerLevel":4,"primary":"intelligence"}'),version=5 where id='campaign'`));
await pass('duplicate class name rejected',()=>deny(`update mechanics_config set config=jsonb_set(config,'{classes,custom-test,name}','"十字军"'),version=6 where id='campaign'`));
await pass('DM assigns new class to character',()=>db.exec(`update characters set class_levels='["custom-test","crusader"]',version=14 where id='${a}'`));
await pass('unregistered class rejected',()=>deny(`update characters set class_levels='["not-registered"]',version=15 where id='${a}'`));
await pass('existing custom class cannot be removed',()=>deny(`update mechanics_config set config=config #- '{classes,custom-test}',version=6 where id='campaign'`));
await db.exec(`select set_config('request.jwt.claim.sub','${a}',false);`);
await pass('authorized player can choose newly defined class',()=>db.exec(`update characters set class_levels='["custom-test","custom-test"]',version=15 where id='${a}'`));
await pass('player cannot add class definitions',async()=>{const r=await db.query(`update mechanics_config set config=jsonb_set(config,'{classes,hacker}','{"name":"非法职业","hpPerLevel":999,"primary":""}'),version=6 returning id`);if(r.rows.length)throw Error('player changed catalog')});
await db.exec(`select set_config('request.jwt.claim.sub','',false);`);
await pass('non-member cannot see rules',async()=>{const r=await db.query('select * from mechanics_config');if(r.rows.length)throw Error('rules leaked')});

await db.exec(`select set_config('request.jwt.claim.sub','',false);`);
await pass('missing identity reads no characters',async()=>{const r=await db.query('select * from characters');if(r.rows.length)throw Error('anonymous visibility')});
console.log(`${count} database checks passed`);await db.close();
