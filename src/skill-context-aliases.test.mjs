import assert from 'node:assert/strict';import {loadTs} from './test-module.mjs';
const {skillCheck,skillScenarios}=await loadTs('./skill-values.ts');
const effect=(id,value,context,bonusType='circumstance')=>({id,name:id,value,context,bonusType,enabled:true});
const group={long:[effect('synergy-a',2,'目标为卷轴的时候'),effect('synergy-b',2,'目标为卷轴时')],short:[effect('spectacles',5,'对象为卷轴','competence'),effect('reading',3,'阅读卷轴'),effect('wand',100,'对象为魔杖')]};
for(const context of ['目标为卷轴','目标为卷轴时','目标为卷轴的时候','对象为卷轴','对象为卷轴时','对象为卷轴的时候'])assert.equal(skillCheck(10,group,context).total,19);
assert.equal(skillCheck(10,group,['目标为卷轴的时候','对象为卷轴']).total,19);assert.equal(skillCheck(10,group).total,10);
const scenarios=skillScenarios(10,group);assert.equal(scenarios.filter(s=>s.context==='对象为卷轴').length,1);assert.equal(scenarios.find(s=>s.context==='对象为卷轴').total,19);assert.equal(scenarios.find(s=>s.context==='阅读卷轴').total,13);assert.equal(scenarios.find(s=>s.context==='对象为魔杖').total,110);
console.log('Scroll condition aliases: merged scenario and bonuses, no double counting, distinct reading/wand tasks preserved');
