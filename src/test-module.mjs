import {readFileSync} from 'node:fs';
import ts from 'typescript';
export function loadTs(relative){
 const memo=new Map();
 function compile(url){if(memo.has(url.href))return memo.get(url.href);let code=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;code=code.replace(/from\s+(['"])(\.\/[^'"]+)\1/g,(_,q,path)=>'from '+JSON.stringify(compile(new URL(path+'.ts',url))));const encoded='data:text/javascript;base64,'+Buffer.from(code).toString('base64');memo.set(url.href,encoded);return encoded}
 return import(compile(new URL(relative,import.meta.url)));
}
