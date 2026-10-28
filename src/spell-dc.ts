import {calculateAbilities} from './calculator';
import type {EffectCharacter,EffectGroup} from './calculator';
import type {RuleState} from './rule-types';
import {stackGroups} from './bonuses';
export const dcAbilities={cleric:'wisdom',artificer:'intelligence','shrine-maiden':'intelligence'} as const;
export function spellDc(c:EffectCharacter&{rule_state?:RuleState},classId:string,ring:number,adjustments?:EffectGroup){const ability=dcAbilities[classId as keyof typeof dcAbilities];if(!ability||!c.class_levels.includes(classId))return null;return Math.floor(10+ring+Math.floor((calculateAbilities(c)[ability]-10)/2)+stackGroups([...(adjustments?.long??[]),...(c.rule_state?.dmBuffs??[]).filter(b=>b.enabled&&(b.acquiredLevel===undefined||b.acquiredLevel<=c.class_levels.length)&&b.target===`spellDc.${classId}`&&b.duration==='long')],[...(adjustments?.short??[]),...(c.rule_state?.dmBuffs??[]).filter(b=>b.enabled&&(b.acquiredLevel===undefined||b.acquiredLevel<=c.class_levels.length)&&b.target===`spellDc.${classId}`&&b.duration==='short')]).total)}
