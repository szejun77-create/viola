import type {RuleModule} from './rule-types';
export const crusaderStances:RuleModule[]=[
  {
    "category": "spell",
    "equipmentSlot": "stance",
    "mode": "passive",
    "parameters": {},
    "outputs": [],
    "id": "leading_the_charge",
    "name": "领导冲锋",
    "description": "其他队友冲锋时，伤害获得等于架势使用者角色总等级的无名加值。",
    "grant": {
      "name": "领导冲锋",
      "group": "ally",
      "mode": "all",
      "includeSelf": false,
      "recipientWhen": "conditions.charge",
      "outputs": [
        {
          "target": "damage",
          "value": "level",
          "duration": "short",
          "bonusType": "unnamed"
        }
      ]
    }
  },
  {
    "category": "spell",
    "equipmentSlot": "stance",
    "mode": "passive",
    "parameters": {},
    "outputs": [
      {
        "target": "damageDice",
        "value": "1",
        "duration": "short",
        "bonusType": "unnamed",
        "die": 6,
        "attackMode": "melee"
      },
      {
        "target": "defenseCommon",
        "value": "-2",
        "duration": "short",
        "bonusType": "unnamed"
      }
    ],
    "id": "punishing_stance",
    "name": "惩戒姿态"
  },
  {
    "category": "spell",
    "equipmentSlot": "stance",
    "mode": "passive",
    "parameters": {},
    "outputs": [
      {
        "target": "skill.jump",
        "value": "10",
        "duration": "short",
        "bonusType": "unnamed"
      }
    ],
    "id": "leaping_dragon_stance",
    "name": "腾龙势",
    "notes": [
      {
        "text": "跳跃视为已助跑。",
        "category": "noncombat"
      }
    ]
  },
  {
    "category": "spell",
    "equipmentSlot": "stance",
    "mode": "passive",
    "parameters": {},
    "outputs": [
      {
        "target": "weaponSize",
        "value": "1",
        "duration": "short",
        "bonusType": "unnamed"
      }
    ],
    "id": "giants_stance",
    "name": "巨人势"
  }
];
