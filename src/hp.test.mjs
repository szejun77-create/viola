import assert from 'node:assert/strict';
import {loadTs} from './test-module.mjs';
const {calculateHp,validHpEffects}=await loadTs('./hp.ts');
const effects=[5,12,-7].map((value,i)=>({id:String(i),name:'魔法'+i,value,enabled:true}));
const hp=calculateHp(72,18,9,[],effects);
assert.equal(hp.constitution,36);assert.equal(hp.short,10);assert.equal(hp.total,118);
assert.equal(calculateHp(72,20,9,[],effects).total,127); // adjusted Constitution changes HP automatically
assert.equal(calculateHp(72,9,9).constitution,-9); // floor, not truncation
assert.equal(calculateHp(90,20,10,[{id:'long',name:'长效',value:12,enabled:true}],effects).total,162);
assert.equal(calculateHp(72,18,9,[],effects.map((x,i)=>i===1?{...x,enabled:false}:x)).short,-2);
assert.equal(calculateHp(null,18,9).total,null);
assert(validHpEffects(effects));assert(!validHpEffects([{...effects[0],value:NaN}]));
console.log('HP formula, adjusted Constitution, negative floor, effect summation/toggle and missing base checks passed');
