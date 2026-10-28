import type {Mechanics} from './mechanics';
import type {RuleModule} from './rule-types';
import {ruleCatalog,validateModule,validateCatalog} from './rule-schema';
import {validateSpellConfiguration} from './spell-preparation';
export function planModuleImport(text:string,config:Mechanics){
 if(text.length>5_000_000)throw Error('导入内容不能超过5MB');
 let parsed:unknown;try{parsed=JSON.parse(text.replace(/^\uFEFF/,''))}catch(e){throw Error(`JSON语法错误：${(e as Error).message}`)}
 const raw=Array.isArray(parsed)?parsed:parsed&&typeof parsed==='object'&&'modules' in parsed?(parsed as {modules:unknown}).modules:[parsed];
 if(!Array.isArray(raw)||!raw.length||raw.length>1000)throw Error('请提供1–1000个模块的JSON数组，也支持单个模块或{"modules":[...]}');
 const seen=new Set<string>();for(const [index,row]of raw.entries()){if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||!row.id)throw Error(`第${index+1}项缺少有效id`);if(seen.has(row.id))throw Error(`第${index+1}项重复id：${row.id}`);seen.add(row.id)}
 const catalog=ruleCatalog(config),input=structuredClone(raw) as RuleModule[],merged={...catalog.modules,...Object.fromEntries(input.map(m=>[m.id,m]))};
 const modules=input.map((row,index)=>{try{return validateModule(row,catalog.weaponVariables,merged,catalog.conditions)}catch(e){throw Error(`第${index+1}项「${row.name??row.id}」(${row.id})：${(e as Error).message}`)}});
 const next={...config,modules:{...catalog.modules,...Object.fromEntries(modules.map(m=>[m.id,m]))}};
 validateCatalog(ruleCatalog(next));validateSpellConfiguration(next);
 return {next,rows:modules.map(m=>({id:m.id,name:m.name,category:m.category,update:Object.hasOwn(catalog.modules,m.id)}))};
}
