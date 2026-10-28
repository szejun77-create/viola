import {sumNumbers,product} from './decimal';
export type Value=number|string|boolean;
type Node={kind:'literal';value:Value}|{kind:'ref';name:string}|{kind:'unary';op:string;arg:Node}|{kind:'binary';op:string;left:Node;right:Node}|{kind:'call';name:string;args:Node[]};
const aliases:Record<string,string>={'如果':'IF','最小值':'MIN','最大值':'MAX','求和':'SUM','向下取整':'FLOOR','向上取整':'CEIL','四舍五入':'ROUND','绝对值':'ABS','限制':'CLAMP'};
const functions=new Set(['IF','MIN','MAX','SUM','FLOOR','CEIL','ROUND','ABS','CLAMP','AND','OR','NOT']);
const functionName=(name:string)=>aliases[name]||name.toUpperCase();
const precedence:Record<string,number>={'||':1,'&&':2,'==':3,'=':3,'!=':3,'<':4,'<=':4,'>':4,'>=':4,'+':5,'-':5,'*':6,'/':6,'%':6};
const cache=new Map<string,Node>();
export function parseExpression(source:string):Node{
 if(source.length>2048)throw Error('公式过长（最多 2048 字符）');if(cache.has(source))return cache.get(source)!;
 const tokens:{text:string;value?:Value;literal?:boolean}[]=[];let cursor=0;
 while(cursor<source.length){const rest=source.slice(cursor);if(/^\s/.test(rest)){cursor++;continue}const number=rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);if(number){tokens.push({text:number[0],value:Number(number[0]),literal:true});cursor+=number[0].length;continue}
  if(rest[0]==='"'||rest[0]==="'"){const quote=rest[0];let text='',i=1,closed=false;for(;i<rest.length;i++){if(rest[i]===quote){closed=true;i++;break}if(rest[i]==='\\'){i++;if(i>=rest.length)break;text+=({n:'\n',t:'\t',r:'\r'} as Record<string,string>)[rest[i]]??rest[i]}else text+=rest[i]}if(!closed)throw Error('字符串未闭合');tokens.push({text:rest.slice(0,i),value:text,literal:true});cursor+=i;continue}
  const identifier=rest.match(/^[\p{L}_][\p{L}\p{N}_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/u);if(identifier){tokens.push({text:identifier[0]});cursor+=identifier[0].length;continue}
  const op=rest.match(/^(?:&&|\|\||==|!=|<=|>=|[+\-*/%<>=!(),])/);if(!op)throw Error(`公式含不支持的字符：${rest[0]}`);tokens.push({text:op[0]});cursor+=op[0].length;
  if(tokens.length>512)throw Error('公式过于复杂');
 }
 if(tokens.length>512)throw Error('公式过于复杂');let i=0,depth=0;
 function expression(min=0):Node{if(++depth>32)throw Error('公式嵌套过深');let node:Node;const token=tokens[i++];if(!token)throw Error('公式不完整');if(token.literal)node={kind:'literal',value:token.value!};else if(['+','-','!'].includes(token.text))node={kind:'unary',op:token.text,arg:expression(7)};else if(token.text==='('){node=expression();if(tokens[i++]?.text!==')')throw Error('缺少右括号');}else if(/^[\p{L}_]/u.test(token.text)){
  if(tokens[i]?.text==='('){i++;const name=functionName(token.text);if(!functions.has(name))throw Error(`未知函数 / Unknown function: ${token.text}`);const args:Node[]=[];if(tokens[i]?.text!==')'){do{args.push(expression());if(tokens[i]?.text!==',')break;i++;}while(true)}if(tokens[i++]?.text!==')')throw Error('函数括号不完整');if(args.length>32)throw Error('函数参数过多');if((name==='IF'||name==='CLAMP')&&args.length!==3||['FLOOR','CEIL','ROUND','ABS','NOT'].includes(name)&&args.length!==1||!args.length)throw Error(`${name} 参数数量错误`);node={kind:'call',name,args};}
  else if(['true','false'].includes(token.text.toLowerCase()))node={kind:'literal',value:token.text.toLowerCase()==='true'};else node={kind:'ref',name:token.text};
 }else throw Error(`意外的符号 ${token.text}`);
 while(i<tokens.length&&precedence[tokens[i].text]!==undefined&&precedence[tokens[i].text]>=min){const op=tokens[i++].text;node={kind:'binary',op,left:node,right:expression(precedence[op]+1)}}depth--;return node;}
 const result=expression();if(i!==tokens.length)throw Error(`多余的内容：${tokens[i].text}`);if(cache.size>500)cache.clear();cache.set(source,result);return result;
}
export function expressionRefs(source:string){const refs=new Set<string>();function walk(node:Node){if(node.kind==='ref')refs.add(node.name);else if(node.kind==='unary')walk(node.arg);else if(node.kind==='binary'){walk(node.left);walk(node.right)}else if(node.kind==='call')node.args.forEach(walk)}walk(parseExpression(source));return [...refs]}
export function evaluateExpression(source:string,resolve:(name:string)=>Value):Value{
 let budget=2048;const numeric=(v:Value)=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('此处需要有限数字');return v};const boolean=(v:Value)=>{if(typeof v!=='boolean')throw Error('此处需要布尔值 true/false');return v};
 function run(node:Node):Value{if(--budget<0)throw Error('公式计算量超出限制');if(node.kind==='literal')return node.value;if(node.kind==='ref')return resolve(node.name);if(node.kind==='unary'){const v=run(node.arg);return node.op==='!'?!boolean(v):node.op==='-'?-numeric(v):numeric(v)}if(node.kind==='binary'){
  const a=run(node.left);if(node.op==='&&')return boolean(a)&&boolean(run(node.right));if(node.op==='||')return boolean(a)||boolean(run(node.right));const b=run(node.right);if(node.op==='=='||node.op==='=')return a===b;if(node.op==='!=')return a!==b;if(['<','<=','>','>='].includes(node.op)){const x=numeric(a),y=numeric(b);return node.op==='<'?x<y:node.op==='<='?x<=y:node.op==='>'?x>y:x>=y}const x=numeric(a),y=numeric(b);if((node.op==='/'||node.op==='%')&&y===0)throw Error('除数不能为 0');return node.op==='+'?sumNumbers([x,y]):node.op==='-'?sumNumbers([x,-y]):node.op==='*'?product(x,y):node.op==='/'?x/y:x%y;
 }
 if(node.name==='IF')return run(node.args[boolean(run(node.args[0]))?1:2]);if(node.name==='AND')return node.args.every(n=>boolean(run(n)));if(node.name==='OR')return node.args.some(n=>boolean(run(n)));if(node.name==='NOT')return !boolean(run(node.args[0]));const args=node.args.map(n=>numeric(run(n)));switch(node.name){case 'MIN':return Math.min(...args);case 'MAX':return Math.max(...args);case 'SUM':return sumNumbers(args);case 'FLOOR':return Math.floor(args[0]);case 'CEIL':return Math.ceil(args[0]);case 'ROUND':return Math.round(args[0]);case 'ABS':return Math.abs(args[0]);case 'CLAMP':if(args[1]>args[2])throw Error('CLAMP 下限不能大于上限');return Math.max(args[1],Math.min(args[2],args[0]));default:throw Error('未知函数')}
 }
 const value=run(parseExpression(source));if(typeof value==='number'&&!Number.isFinite(value))throw Error('公式结果不是有限数字');return value;
}
