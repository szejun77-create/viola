# 规则模块手册 / Rule Module Handbook

本手册对应当前网站的实际接口。先读第1、2、3节，再复制猛力攻击示例修改。公式使用有名字的字段代替 Excel 的 A1、B6，不是 JavaScript。
This handbook documents the implemented interface. Start with sections 1–3 and copy the Power Attack example. Named references replace Excel cell addresses; expressions are not JavaScript.

## 1. 操作 / Workflow

1. GM 打开角色，再点顶部「规则模块」。在右侧栏选择示例或新建，编辑 JSON，预览并保存定义。
   As GM, select a character and open “规则模块”. Select a sample or create a definition, edit JSON, preview and save.
2. 将模块分配给角色；选权限，再启用。定义是全局模板，分配是角色自己的实例，可以多次分配同一个模块。
   Assign the module to a character, choose access and enable it. Definitions are shared templates; assignments are independent instances. A template can be assigned more than once.
3. 保存角色模块。玩家到自己的速查卡操作获准的开关和参数，再保存。
   Save character modules. Players use permitted switches and parameters on their quick card, then save.
4. 模块定义保存和角色状态保存是两件事。速查卡与侧栏各有草稿，先保存当前草稿再切换编辑位置。
   Saving a definition and saving character state are separate actions. Finish saving the current draft before editing the same character elsewhere.

内置猛力攻击只是模板，默认不会给所有角色自动启用。编辑已分配模块的定义，会影响使用该定义的所有角色；改 id 相当于另一份定义，不会替换旧实例的关联。
The built-in Power Attack is an unassigned template. Editing a shared definition affects all characters using it. A new id creates a separate definition and does not retarget existing assignments.

## 2. 公式字段对应表 / Formula Reference Map

### 基础上下文 / Context

|引用 / Reference|含义 / Meaning|
|---|---|
|`current.hp`|当前生命，可用于备忘录条件、变量和输出；不用于参数范围或资源初始值/范围 / Current HP for note conditions, variables and outputs; not input bounds or resource initialization/bounds|
|`level`|角色总等级（职业履历的条数） / Total character level|
|`bab`|Σ(各职业基础命中 × 对应等级)，保留小数 / Raw sum of class attack rates × class levels|
|`base.hp`|Σ(各职业基础生命 × 对应等级)，不含体质 / Raw class HP contribution|
|`innate.<属性>`|角色档案的天生属性 / Innate ability score|
|`ability.<属性>`|含长效、短效并完成加值叠加后的属性 / Adjusted ability score|
|`mod.<属性>`|floor((调整后属性−10)/2) / Adjusted ability modifier|
|`params.<名字>`|当前模块实例的输入参数 / Instance input|
|`vars.<名字>`|本模块 variables 中定义的计算变量 / Computed local variable|
|`weapon.<名字>`|该角色的武器上下文变量 / Character weapon context|

`<属性>` 对应如下。变量名区分大小写；例如 `mod.strength` 可用，`mod.Strength` 不可用。
Ability keys below are case-sensitive.

|中文|English / key|
|---|---|
|力量|`strength`|
|敏捷|`dexterity`|
|体质|`constitution`|
|智力|`intelligence`|
|感知|`wisdom`|
|魅力|`charisma`|

例：`mod.constitution * level`、`IF(weapon.two_handed, 2, 1)`。
Examples: Constitution modifier × level; a two-handed damage multiplier.

缺失的职业基础数值不会偷偷当作0；依赖该字段的启用模块会显示错误。`bab` 不预先取整：整数参数上限为9.75时，可输入的最大整数是9。
Missing class base values cause a visible error when referenced. Raw BAB is not rounded first: an integer parameter capped at 9.75 accepts at most 9.

### 输出目标 / Output Targets

输出的数值是加入对应目标的来源，不是覆盖最终数值。
Each output contributes an adjustment to its target; it does not replace the final result.

|target|中文|English|
|---|---|---|
|`strength`|力量|Strength|
|`dexterity`|敏捷|Dexterity|
|`constitution`|体质|Constitution|
|`intelligence`|智力|Intelligence|
|`wisdom`|感知|Wisdom|
|`charisma`|魅力|Charisma|
|`hp`|生命上限|Maximum HP|
|`melee`|近战命中|Melee attack|
|`ranged`|远程命中|Ranged attack|
|`fortitude`|强韧|Fortitude|
|`reflex`|反射|Reflex|
|`will`|意志|Will|
|`classSkill`|本职技能点|Class skill points|
|`crossSkill`|跨职技能点|Cross-class skill points|
|`damage`|伤害加值|Damage adjustment|
|`defenseCommon`|通用防御（三种均适用）|Common defense adjustment|
|`defense`|仅普通防御|Normal-defense-specific adjustment|
|`touchDefense`|接触防御|Touch defense|
|`flatDefense`|措手不及防御|Flat-footed defense|
|`grapple`|擒抱对抗|Grapple|
|`speed`|移动速度|Speed|
|`initiative`|先攻|Initiative|
|`damageReduction`|伤害减免|Damage reduction|
|`spellResistance`|法术抗性|Spell resistance|

`duration: "long"` 是长效来源，`"short"` 是短效来源。两者都自动算，不需要把合计手填回角色。技能点只接受 long。
Long and short describe source duration. Both calculate automatically. Skill points accept long only.

伤害目前只算加值，不含武器基础伤害。防御、接触、措手不及已按第14节计算；擒抱、先攻、减免和抗性的基础公式尚未约定，界面单列模块附加。移动速度保留种族基础值并另列模块附加，不擅自确定速度取高、倍乘等规则。
Damage shows adjustments only, excluding weapon damage. Defense variants now calculate as described in section 14. Grapple, initiative, DR and SR retain pending base formulas and display module contributions separately. Speed displays racial base and module contribution separately; speed-specific stacking or multipliers are not inferred.

### 现有基础公式 / Existing Base Formulas

- HP：职业基础生命合计 + 体质调整×总等级 + 长效 + 短效。
  HP: class HP + Constitution modifier × total level + long + short.
- 近战/远程：职业基础命中合计 + 力量/敏捷调整 + 长效 + 短效。
  Melee/ranged: class attack sum + Strength/Dexterity modifier + effects.
- 三豁免：职业对应基础×等级的合计 + 首级奖励 + 对应属性调整 + 长效 + 短效。仅角色第1级职业对应基础为0.5时，该项给一次1.5。强韧用体质，反射用敏捷，意志用感知。
  Saves: class rate sum + first-level bonus + relevant modifier + effects. A 0.5 rate in the character’s first class level grants 1.5 once for that save. Fortitude uses CON, Reflex DEX, Will WIS.
- 本职技能点：Σ((职业本职基础 + 该职业主属性调整)×职业等级) + 长效。
  Class skills: Σ((class skill base + class primary modifier) × class levels) + long.
- 跨职技能点：Σ(职业跨职基础×职业等级) + 智力调整×总等级 + 长效。
  Cross-class skills: class cross-skill sum + INT modifier × total level + long.

属性调整值自身按定义向下取整；除此以外，公式保留中间小数，最终合计向下取整。主动写 FLOOR 会在该位置明确取整。
Ability modifiers are inherently floored. Other intermediate values retain decimals until the final total is floored. Explicit FLOOR introduces rounding at that point.

## 3. 完整模块示例 / Complete Module Example

```json
{
  "id": "power_attack",
  "name": "猛力攻击 / Power Attack",
  "category": "feat",
  "description": "扣命中，增加伤害；双手时乘2。",
  "parameters": {
    "x": {
      "label": "扣减命中 / Attack reduction",
      "type": "number",
      "default": 1,
      "min": "1",
      "max": "bab",
      "integer": true,
      "playerEditable": true
    }
  },
  "variables": {
    "damage_multiplier": "IF(weapon.two_handed, 2, 1)"
  },
  "outputs": [
    {"target":"melee","duration":"short","bonusType":"unnamed","value":"-params.x"},
    {"target":"damage","duration":"short","bonusType":"unnamed","value":"params.x * vars.damage_multiplier"}
  ]
}
```

给角色分配后，将权限设为 parameters，玩家可启停并选 x。BAB=9、x=3 时，近战−3；单手伤害+3，双手伤害+6。若要能关闭，用模块开关，x仍为1起步。
Assign with parameters access. At BAB 9 and x=3, melee is −3, damage +3 or +6 when two-handed. Use the module switch to turn it off; x starts at 1.

## 4. 模块结构 / Module Structure

|字段 / Field|说明 / Meaning|
|---|---|
|`id`|稳定的英文标识；字母或下划线开头，后续字母、数字、下划线，最多64字符 / Stable identifier|
|`name`|显示名称，最多100字符 / Display name|
|`category`|feat专长、race种族、class职业、item物品、spell法术、other其他 / Category|
|`description`|可选文字说明 / Optional description|
|`parameters`|输入参数对象，无参数用 `{}` / Input definitions|
|`variables`|可选计算变量对象，值都是公式字符串 / Optional computed expressions|
|`outputs`|0–64条输出 / Output list|

分类不会自动决定长短效，也不会自动授权玩家。`parameters` 和 `variables` 各最多32项；模块库最多200个定义，每角色最多1000个实例。
Category does not determine duration or player access. Up to 32 parameters, 32 computed variables, 200 definitions and 1000 instances per character.

输出字段 / Output fields:

|字段|含义 / Meaning|
|---|---|
|`target`|第2节目标名 / Target key|
|`duration`|`long` 或 `short` / Duration|
|`bonusType`|第7节加值类别 / Bonus type|
|`value`|返回数字的公式字符串，如 `"5"` / Numeric expression string|
|`when`|可选，返回布尔值；false时不产生此项 / Optional boolean condition|

例如洞察先攻+5：`{"target":"initiative","duration":"long","bonusType":"insight","value":"5"}`。
Example: a long-duration +5 insight bonus to initiative.

## 5. 自定义输入与武器变量 / Inputs and Weapon Variables

|字段 / Field|说明 / Meaning|
|---|---|
|`label`|界面名称 / UI label|
|`type`|number数字、boolean是非、choice下拉 / Input type|
|`default`|数字、true/false或选项字符串，与类型一致 / Typed default|
|`min`, `max`|数字上下限公式，用字符串，例如 `"1"`、`"bab"` / Numeric bounds as expressions|
|`integer`|数字是否必须整数 / Integer-only flag|
|`options`|choice允许的字符串数组 / Allowed choice values|
|`playerEditable`|是否允许玩家改此输入，默认否；还需实例权限配合 / Player input permission, default false|

参数范围仅引用 `level`、`bab`、`base.hp`、`innate.*`、已声明的 `weapon.*`，避免范围与结果互相依赖。武器变量自己的范围不能引用 weapon、params、vars、ability 或 mod。
Parameter bounds may reference level, BAB, base HP, innate abilities and declared weapon variables. Weapon bounds may reference only level, BAB, base HP and innate abilities.

在侧栏的武器变量定义区保存：
Save these definitions in the weapon-variable editor:

```json
{
  "two_handed": {"label":"双手 / Two-handed","type":"boolean","default":false,"playerEditable":true},
  "stance": {"label":"姿态 / Stance","type":"choice","default":"normal","options":["normal","guarded"],"playerEditable":true},
  "enhancement": {"label":"武器增强 / Weapon enhancement","type":"number","default":0,"min":"0","integer":true,"playerEditable":false}
}
```

使用 `weapon.two_handed`、`weapon.stance = "guarded"`、`weapon.enhancement`。这些是手动声明和填写的上下文，不会自动识别装备。最多64个武器变量；choice最多50项。字符串选项区分大小写。
Reference those names in expressions. These are declared context inputs, not automatic equipment detection. Up to 64 weapon variables and 50 choices per choice input. Choice values are case-sensitive.

模块内同样可声明 boolean / choice 参数，通过 `params.<名字>` 使用。`variables` 是计算结果，例如 `"extra": "MAX(0, mod.strength)"`，不允许玩家直接填写。
Modules may also declare boolean/choice parameters. Computed variables such as `"extra": "MAX(0, mod.strength)"` cannot be edited directly by players.

## 6. 玩家权限 / Player Permissions

|实例 access|GM|玩家 / Player|
|---|---|---|
|`gm`|可改 / Editable|只看，不能启停或改参数 / Read-only|
|`toggle`|可改 / Editable|只可启停 / Toggle only|
|`parameters`|可改 / Editable|可启停；仅可改 playerEditable=true 的参数 / Toggle and permitted inputs|

玩家不能新增、删除或重新分配模块，不能改公式、类别、实例权限或GM锁定参数。模块参数权限不要求开放手工长效/短效来源编辑，两套权限独立。
Players cannot add/remove assignments, edit definitions, change access or alter locked parameters. Module input permissions are independent of manual source-editing permissions.

玩家修改武器上下文需要：角色授权「武器上下文」(`weapon_context`)，并且该武器变量 `playerEditable:true`。GM不受这两项限制。
Weapon edits require both character permission weapon_context and the variable’s playerEditable flag. GM can edit either way.

超出范围、缺少引用、类型不符会提示；启用状态不合法时不能保存，不会自动把错误数字夹到上限。计算时整个有错误的模块实例被排除，不会只应用它的一半效果。
Invalid ranges, references and types show errors. Invalid active state cannot be saved and values are not silently clamped. A failing instance contributes no partial effects.

## 7. 加值类别与叠加 / Bonus Types and Stacking

`bonusType` 可写中文或英文；英文不区分大小写，空格、连字符、下划线可归一。例如 `INSIGHT` 和 `洞察` 都是 insight。错误拼写阻止保存。推荐始终复制下表 key。
Chinese and English bonus names are accepted case-insensitively with normalized separators. Misspellings block saving. Copy canonical keys below.

|中文|English|key|
|---|---|---|
|炼金|Alchemical|`alchemical`|
|盔甲|Armor|`armor`|
|环境|Circumstance|`circumstance`|
|表现|Competence|`competence`|
|偏斜|Deflection|`deflection`|
|闪避|Dodge|`dodge`|
|增强|Enhancement|`enhancement`|
|内在|Inherent|`inherent`|
|洞察|Insight|`insight`|
|幸运|Luck|`luck`|
|士气|Morale|`morale`|
|天生防御|Natural Armor|`natural_armor`|
|亵渎|Profane|`profane`|
|种族|Racial|`racial`|
|反抗|Resistance|`resistance`|
|神圣|Sacred|`sacred`|
|盾牌|Shield|`shield`|
|体型|Size Modifier|`size`|
|无名|Unnamed|`unnamed`|

同一目标中，长效与短效放在一起比较：除环境和无名外，每类保留最大正值和绝对值最大的负值；两者可同时存在。+2、+5、−2、−4最终为+1。相同数值并列保留第一条，其他来源仍显示但不计入。
For each target, long and short compete together. Except circumstance and unnamed, retain the largest positive and most negative contribution per type. +2, +5, −2, −4 yields +1. Equal ties keep the first; suppressed sources remain visible.

环境和无名全部相加，包括正负，重复无名由DM判断。闪避在这里按照你约定的普通类型处理，不另套标准规则例外。旧手工来源没写类型时视作无名。启用模块和手工来源也一起参加上述比较。
Circumstance and unnamed stack fully. The DM adjudicates duplicate unnamed effects. Dodge follows your ordinary typed rule here. Legacy untyped manual effects count as unnamed. Module and manual effects compete together.

## 8. 表达式语法 / Expression Syntax

|用途 / Purpose|语法 / Syntax|
|---|---|
|四则与余数 / Arithmetic|`+ - * / %`、括号 / parentheses|
|比较 / Comparison|`= == != < <= > >=`|
|布尔 / Boolean|`&&`、`||`、`!`、`true`、`false`|
|字符串 / Strings|`"guarded"` 或单引号 / or single quotes|
|条件 / Conditional|`IF(condition, yes, no)` / `如果(...)`|
|最小、最大、求和 / Aggregate|`MIN(...)`、`MAX(...)`、`SUM(...)`|
|取整 / Rounding|`FLOOR(x)`、`CEIL(x)`、`ROUND(x)`|
|绝对值 / Absolute value|`ABS(x)`|
|夹紧 / Clamp|`CLAMP(x, min, max)`|
|逻辑函数 / Logical functions|`AND(...)`、`OR(...)`、`NOT(x)`|

中文别名：最小值、最大值、求和、向下取整、向上取整、四舍五入、绝对值、限制；逻辑函数使用英文。函数名不区分大小写；引用字段名区分大小写。
Chinese function aliases are listed above. Function names are case-insensitive; variable keys are case-sensitive.

`IF`只执行选中的分支，所以 `IF(false, 1/0, 5)` 等于5。数字和布尔不混用：条件写 `params.x > 0`，不直接写数字当条件。`ROUND`用 JavaScript Math.round 的半值规则，负半数趋向正无穷；例如−1.5→−1。
IF evaluates only the chosen branch. Conditions require booleans, not numeric truthiness. ROUND uses Math.round semantics, with negative half ties toward positive infinity.

`variables` 可互相引用，不能循环。修改六大属性的输出（包括 when 及间接变量）不能引用最终 ability/mod，避免自己改变自己的计算基础；可以使用 innate、params、weapon 等。
Computed variables can reference each other without cycles. Outputs modifying abilities cannot depend directly or indirectly on adjusted ability/mod values; use innate values or other stable inputs.

目前不提供任意JavaScript函数、循环、文件访问、网络请求、随机数和最终HP/命中互相引用。复杂逻辑用布尔条件、多个变量和多条输出表达。每式最多2048字符、512个词法单元、32层括号/表达式嵌套，每函数最多32参数。
Arbitrary JavaScript, loops, I/O, networking, randomness and cyclic derived-stat references are unsupported. Compose conditions, computed variables and multiple outputs instead. Limits: 2048 characters, 512 tokens, 32 nesting levels and 32 arguments per function.

## 9. 存储与备份 / Storage and Backup

本地模式：模块库与武器变量声明存入现有 `ember-mechanics`；角色实例、开关、参数与武器值存入 `ember-characters` 下各角色的 `rule_state`。不把计算结果重复存回基础来源。使用网站的完整导出保存JSON备份，换浏览器或清理网站数据前先导出。
Local mode: definitions live in ember-mechanics; assignments, toggles, inputs and weapon values live in each character’s rule_state in ember-characters. Calculated effects are not stored as manual effects. Use the existing full JSON export before clearing browser storage or moving devices.

数据形状示例（用于理解，无需自己修改存档）：
State example (for reference; normal editing uses the UI):

```json
{
  "instances": [
    {"id":"unique_instance_1","moduleId":"power_attack","enabled":true,"access":"parameters","params":{"x":3}}
  ],
  "weapon": {"two_handed":true}
}
```

目前仍可完全本地使用。将来接Supabase时，除已有迁移外需运行009_rule_modules.sql并部署module-state Edge Function；服务端复用同一校验引擎，普通玩家不能直接绕过端点改模块状态，原有字段锁定仍生效。不要把service_role密钥放前端。
Local operation remains available without Supabase. Future cloud deployment requires migrations 009/010 and the module-state Edge Function. Server validation reuses the same engine, blocks direct player state writes and retains manual-field locks. Never put the service-role key in the frontend.

开发者：修改规则引擎后运行 `python3 scripts/sync-rule-runtime.py` 再部署函数，生成的 `_shared` 文件不应独立编辑。此版没有连接真实Supabase验证部署；本地规则测试和数据库权限测试另行覆盖。
Developers: regenerate the shared function runtime after engine changes. Do not edit generated _shared files independently. Live Supabase deployment has not been verified in this release.

## 10. 能力赋予资源与按钮 / Granted Resources and Actions

新增这三个可选字段；旧模块不需要改。
Three optional fields extend existing modules without changing old definitions:

|字段 / Field|含义 / Meaning|
|---|---|
|`mode`|`passive` 被动常驻，无启停开关；`toggle` 可启停，省略时保持旧行为 / Passive always-on or toggleable (default)|
|`resources`|模块赋予的资源定义对象，最多32项 / Up to 32 granted resource definitions|
|`actions`|操作按钮数组，最多32项 / Up to 32 action buttons|

心似钢铁例子见 [完整可复制 JSON](examples/steel-heart.json)。在规则模块栏点「心似钢铁示例」→保存模块定义→分配角色→保存角色模块。打开「速算卡」查看伤害缓冲池与结算按钮。能力列表中显示在职业能力下。不必给玩家启停或参数权限；资源、按钮有自己的授权。
Open the Steel Heart sample in the module sidebar, save its definition, assign it and save the assignment. The quick calculator displays its buffer and settlement button. It appears under class abilities. Resource/action permissions are independent of instance toggle/parameter access.

```json
{
  "id": "steel_heart",
  "name": "心似钢铁",
  "category": "class",
  "mode": "passive",
  "parameters": {},
  "outputs": [],
  "resources": {
    "damage_buffer": {
      "label": "伤害缓冲池",
      "initial": 0,
      "min": "0",
      "integer": true,
      "playerEditable": true
    }
  },
  "actions": [{
    "id": "settle_damage",
    "label": "结算伤害",
    "playerUsable": true,
    "when": "resources.damage_buffer > 0",
    "changes": [
      {"target": "current.hp", "value": "current.hp - resources.damage_buffer"},
      {"target": "resources.damage_buffer", "value": "0"}
    ]
  }]
}
```

### 资源定义 / Resource Definition

|字段|中文 / English|
|---|---|
|资源的键名，如 `damage_buffer`|英文标识，命名规则同参数 / Identifier follows parameter naming rules|
|`label`|显示名称 / Display label|
|`initial`|首次使用的数字初始值，不是每次刷新的重置值 / Numeric initial fallback, not a reset-on-render value|
|`min`, `max`|可选公式字符串；省略即该方向不限 / Optional bound expressions; omitted means unbounded|
|`integer`|是否只允许整数，默认否 / Integer-only, default false|
|`playerEditable`|玩家可否直接加减或填写，默认否 / Direct player editing permission, default false|

资源上下限可引用 level、bab、base.hp、innate.*、ability.*、mod.*、weapon.*；不能引用资源、参数或vars，避免边界循环。资源当前值只在按钮公式及条件中通过 `resources.键名` 引用，从第11节版本起，自动属性输出也可读取自身或其他模块的资源。
Resource bounds use level, BAB, base HP, innate/adjusted abilities, modifiers and weapon context. They cannot reference resources, parameters or vars. Current resource values are available in actions/conditions; automatic stat outputs can now consume own-instance or cross-module resources as described in section 11.

同一个模板分配两次会产生两个独立资源。数值保存在 `rule_state.resourceValues[实例id][资源名]`，完整导出会带上。停用或移除能力不删除数值；同一实例重新启用会保留原值。移除后重新分配会创建新实例，因此是新的一份资源。已经保存过数值的资源不会因修改 initial 而重置；从未保存过数值的资源使用当前 initial。
Each assignment owns separate resource values under rule_state.resourceValues. Export includes them. Disabling/removing an ability retains stored values; re-enabling the same instance restores them. Reassigning after removal creates a new instance. Changing initial affects only values that have never been stored.

### 操作定义 / Action Definition

|字段|中文 / English|
|---|---|
|`id`|本模块内唯一标识 / Unique identifier within this module|
|`label`|按钮文字 / Button label|
|`playerUsable`|玩家能否执行，默认否；GM可执行 / Player permission, default false; GM permitted|
|`when`|可选布尔条件，不满足时禁用 / Optional boolean precondition|
|`changes`|1–32条修改，每条含target和value，目标不能重复 / 1–32 assignments with unique targets|

操作条件及值公式可使用已有命名字段、params、vars，再加上：
Actions and conditions extend existing context, parameters and computed variables with:

|引用 / Reference|含义 / Meaning|
|---|---|
|`current.hp`|当前生命，可读可作为修改目标 / Current HP; readable and writable|
|`maximum.hp`|自动计算的生命上限，只读；基础未配置时不可用 / Calculated max HP, read-only; unavailable if base data is missing|
|`resources.<键名>`|本能力实例的资源，可读可写 / Own-instance resource, readable and writable|

其他目标不能被按钮写入。全部 value 和 when 读取同一份操作前快照，全部校验成功后才一起保存；数组先后顺序不影响计算。失败不扣血、不清池，云端版本冲突也不提交。空池的结算按钮禁用。按钮会连同当前资源/生命草稿一起校验并提交，通常不必先点保存资源。
Only current HP and own-instance resources are writable. Every expression reads the same pre-action snapshot; all changes commit together only after validation. Failure or cloud version conflict commits nothing. Settlement is disabled at zero. Buttons validate and submit current resource/HP drafts together, so a separate resource save is usually unnecessary.

当前生命使用原来的角色 `hp` 字段，放在玩家资源栏，不另建重复数值。可为负整数，也不会自动夹到生命上限。手工修改当前生命仍需角色的「当前生命」权限；被明确授权的能力按钮可以按定义修改生命，即使手工编辑被锁定。原有其他资源仍遵循原来的0到max限制。
Current HP reuses the character hp field. It permits negative integers and is not silently capped to maximum HP. Manual HP edits require character permission; an explicitly permitted action can change HP even when manual edits are locked. Legacy resources retain their original zero-to-max limits.

直接修改资源后点「保存资源」；模块输入改动仍用「保存操作」。这两个保存入口会刷新角色，请先保存当前正在编辑的一组草稿。不要在另一个入口保存前留下未保存的草稿。
Save direct edits with Save Resources; save module-input edits with Save Operations. Both refresh the character. Finish the current draft before saving through the other entry point.

云端还需迁移 `010_module_resources.sql` 并重新部署 module-state；服务器自己执行按钮公式，不接受玩家上报的结算结果。仅经服务器确认的按钮可以使用其生命修改权限。本地模式无需这些部署步骤。
Cloud mode additionally requires migration 010 and redeployment of module-state. The server evaluates actions itself instead of trusting client-reported results. Local mode needs no deployment steps.

## 11. 跨模块引用 / Cross-module References

每个变量自动拥有完整路径，由稳定模块id、字段分区和字段id组成。显示名可以改，id改变则需要更新引用。路径区分大小写，不引用其他角色的数据。
Each field has a qualified path made from a stable module id, field section and field key. Display names may change without breaking references. Changing ids requires updating formulas. Paths are case-sensitive and only read the current character.

|引用形式 / Reference|例子 / Example|含义 / Meaning|
|---|---|---|
|`modules.<模块id>.resources.<资源id>`|`modules.steel_heart.resources.damage_buffer`|该能力的当前资源值 / Current resource value|
|`modules.<模块id>.params.<参数id>`|`modules.power_attack.params.x`|该实例填写的参数，未填则使用默认值 / Instance parameter or default|
|`modules.<模块id>.vars.<变量id>`|`modules.furious_counterstrike.vars.bonus`|目标模块计算变量的结果 / Target module’s computed variable|

规则模块编辑栏的「跨模块字段」会自动列出库中可复制的完整路径。`resources.damage_buffer` 也能在自身变量和输出中使用；无需再写完整模块名。
The sidebar’s Cross-module Fields section lists copyable paths. Own resources can also be read as resources.damage_buffer inside variables and outputs.

跨模块字段可以用于 variables、outputs 的 value/when，以及操作按钮的公式/条件；暂不用于输入参数或资源的上下限。只允许读取其他模块，不允许按钮直接写其他模块的资源；写入仍只限自己的资源和current.hp。
Cross-module reads are available in computed variables, output values/conditions and action expressions/conditions. Input/resource bounds do not support them. Cross-module writes are not supported; actions still write only their own resources or current.hp.

### 狂怒反击示例 / Furious Counterstrike Example

加载「狂怒反击示例」→保存定义→分配给已有心似钢铁的同一角色→保存角色模块。此示例为常驻能力，无需玩家开关。旧模块库不会被覆盖；若库中没有心似钢铁，先保存它的示例。
Load and save the Furious Counterstrike sample, assign it to the same character as Steel Heart, then save the assignment. This is a passive sample. Existing libraries are preserved; save Steel Heart first if it is absent.

[完整 JSON / Full JSON](examples/furious-counterstrike.json)

```json
{
  "id": "furious_counterstrike",
  "name": "狂怒反击",
  "category": "class",
  "mode": "passive",
  "parameters": {},
  "variables": {
    "buffer": "modules.steel_heart.resources.damage_buffer",
    "bonus": "IF(vars.buffer = 0, 0, MAX(1, FLOOR(vars.buffer / 5)))"
  },
  "outputs": [
    {"target":"damage","duration":"long","bonusType":"unnamed","value":"vars.bonus"},
    {"target":"melee","duration":"long","bonusType":"unnamed","value":"MIN(6, vars.bonus)"},
    {"target":"ranged","duration":"long","bonusType":"unnamed","value":"MIN(6, vars.bonus)"}
  ]
}
```

此示例的命中加值同时作用于近战和远程；若你的房规只需其中一项，删去另一条输出即可。所有输出都是加值，不覆盖原来的伤害或命中。无名加值按既有规则累加。
This sample applies its attack bonus to both melee and ranged. Remove the unwanted output if your house rule applies to only one. Outputs add adjustments rather than replace totals; unnamed bonuses stack under the existing rules.

|缓冲池 / Buffer|伤害加值 / Damage bonus|命中加值 / Attack bonus|
|---|---|---|
|0|0|0|
|1–9|+1|+1|
|10|+2|+2|
|30|+6|+6|
|40|+8|+6|

修改缓冲池草稿后，速算卡立即重算；点保存资源才持久保存。结算伤害成功后池清零，两项加值自动归零，不用按第二个按钮。
Editing the buffer draft immediately recalculates the quick card; Save Resources persists it. Settling damage clears the buffer and automatically removes both bonuses.

### 多实例与权限 / Multiple Instances and Permissions

只有一个对应实例时，完整路径自动指向它。有多个时，在GM侧栏该能力的「引用来源」选择具体实例；不会擅自求和、取最高或选第一个。绑定保存在使用方实例的references中：
A single matching instance is selected automatically. With multiple instances, the GM selects the source under Reference Sources in the sidebar. Values are never silently summed, maximized or chosen by order. Bindings are stored on the consuming instance:

```json
{"references":{"steel_heart":"来源实例的完整id"}}
```

玩家可以通过已授权的资源输入改变数值，但不能更改引用来源。需要先解除绑定，才能删除被该绑定引用的实例。多个实例的参数与资源分别读取，目标模块的vars也使用目标自己的参数，不借用调用方的参数。
Players may edit authorized resources but cannot retarget references. Clear explicit bindings before removing their source instance. Target variables evaluate using the target instance’s own parameters and resources.

缺少能力、来源未启用、字段拼错或来源实例不明确时，会显示错误，整个依赖模块不产生部分加值。被动能力始终可读取，普通能力需启用。变量不能跨模块循环，也不能通过跨模块vars绕过六大属性修改的循环限制。
Missing, inactive, misspelled or ambiguous references show errors and suppress the entire dependent instance’s effects. Passive sources are always active; toggleable sources must be enabled. Cross-module cycles and indirect adjusted-ability feedback loops are rejected.

本次增加不需要新数据库列，引用与绑定随现有配置、角色状态一起导出。未来云端使用前，重新生成共享运行时并部署module-state，使前后端使用一致的引用规则。
No new database columns are required. Definitions and bindings are included in existing exports. Regenerate the shared runtime and redeploy module-state before using the extension in cloud mode.

## 12. 职业等级、常驻资源与可开关增益 / Class Levels, Persistent Pools and Toggleable Buffs

「定罪示例」演示这次增加的四个接口。先保存定义、分配给角色、将实例权限设为「PL仅可启停」并保存。资源区始终显示定罪次数；点击「使用定罪」扣1次并开启增益。关闭增益不清池，也不会返还次数。重复使用会再次扣次；没有自动到期、每日恢复或目标追踪。
The Condemnation sample demonstrates four new interfaces. Save and assign it with player toggle permission. Its pool remains visible; Use Condemnation spends one use and enables the buff. Disabling removes the buff without refunding or resetting uses. Repeated use spends another charge. Expiry, daily recovery and target tracking remain manual.

### 职业等级变量 / Class-Level References

`classes.crusader.level` 是本角色十字军的等级总数，不是角色总等级。兼职会分别统计；已定义但没有修习的职业为0。字段列表可在编辑栏「职业等级变量」复制。
classes.crusader.level counts Crusader levels, not total level. Multiclass levels are counted separately. Defined classes with no levels return zero. The editor lists copyable class references.

|引用 / Reference|职业 / Class|
|---|---|
|`classes.crusader.level`|十字军 / Crusader|
|`classes.warblade.level`|战刃 / Warblade|

其他职业用编辑栏显示的固定id。自定义职业id中若含连字符，会在公式字段中自动转换成下划线：id `my-class` 对应 `classes.my_class.level`。显示名称改变不影响引用。该字段可用于普通公式、初始值、上下限、按钮条件和备忘条件。
Other classes use their fixed ids shown in the editor. Hyphens are converted to underscores: my-class becomes classes.my_class.level. Display-name changes do not affect paths. These references work in expressions, initialization, bounds, actions and note conditions.

### 资源与增益分离 / Separating Pools from Buffs

|字段 / Field|含义 / Meaning|
|---|---|
|`mode: "toggle"`|输出和备忘随实例enabled启停 / Outputs and notes follow enabled|
|`resourceMode: "always"`|资源及其按钮在增益关闭时仍显示、可按权限使用 / Resources and permitted actions remain available while the buff is off|
|`resourceMode: "active"` 或省略|保持旧行为，只有能力启用时显示资源 / Existing behavior: resources follow activation|
|操作目标 `module.enabled`|按钮可用布尔公式开启或关闭自身增益 / An action may set its own enabled state using a boolean expression|

`mode: "passive"` 仍然是整个能力常驻。`module.enabled`只能由操作修改自己，不能改变别的模块，也不能启停passive能力。授权按钮和手工开关的权限独立；定罪示例也允许玩家在有实例权限时手动开关，用于DM裁定，手动开关本身不消耗次数。
Passive modules remain fully always-on. Actions can set only their own toggle state, not other modules or passive abilities. Button permissions and manual toggle permissions are separate. The sample permits manual toggling when instance access allows it; manual toggles do not spend charges and can be used for DM adjudication.

跨模块引用常驻资源时，来源增益关闭也仍可读取其resources；关闭的来源params/vars不因此开放读取。
Cross-module resource references remain readable when an always-visible pool’s buff is off. This does not make inactive source parameters or computed variables readable.

### 初始值和动态范围 / Initialization and Dynamic Bounds

`initial`现在既可填数字，也可填公式字符串。定罪的initial和max同为：
initial now accepts a number or an expression string. Condemnation uses the same formula for initial and max:

```text
mod.charisma + FLOOR(classes.crusader.level / 4)
```

min是 `"0"`。例如魅力调整+4、十字军9级，首次获得6次。资源在保存分配时初始化并持久保存；消耗后不会在刷新、开关、升级或上限变化时自动回满。max会重新计算；如当前次数超出降低后的上限，会显示提示，按DM裁定调整当前次数。公式算出负上限而min为0时会报范围错误，不会擅自改成0。
With CHA +4 and Crusader 9, the initial pool is 6. Initialization is stored when the assignment is saved. Refreshing, toggling, leveling or changing maximum does not refill spent uses. Maximum updates dynamically. A current value above a reduced maximum is flagged for manual adjustment. A negative maximum with min zero is an error, not silently clamped.

initial和范围只读稳定的角色字段、职业等级与武器上下文，不引用params、vars、资源或modules。改变已保存资源的initial定义不会重置当前次数。
Initialization and bounds read character fields, class levels and weapon context, not parameters, computed variables, resources or cross-module paths. Changing initial does not reset stored values.

### 备忘录 / Notes

```json
"notes": [
  {"text": "对目标额外＋1借机次数"},
  {"text": "额外条件提醒示例", "when": "classes.crusader.level >= 20"}
]
```

notes最多32项，每项text最多1000字；when可选并须返回布尔值。只在能力增益启用且条件成立时显示在「速算卡」及「当前状态」的备忘录。显示来源名称；关闭或移除能力后自动消失。备忘仅作提醒，不自动增加借机资源，也不自动选择目标。
Up to 32 notes, each at most 1000 characters; optional when must return a boolean. Active, matching notes appear on the calculator and current-state page with the source name. Notes disappear when disabled or removed. They do not mutate opportunity-attack resources or select targets.

### 定罪模块 / Condemnation Module

[完整示例 / Full example](examples/condemnation.json)

```json
{
  "id": "condemnation",
  "name": "定罪",
  "category": "class",
  "mode": "toggle",
  "resourceMode": "always",
  "parameters": {},
  "resources": {
    "uses": {
      "label": "定罪次数",
      "initial": "mod.charisma + FLOOR(classes.crusader.level / 4)",
      "min": "0",
      "max": "mod.charisma + FLOOR(classes.crusader.level / 4)",
      "integer": true,
      "playerEditable": true
    }
  },
  "actions": [{
    "id": "use",
    "label": "使用定罪",
    "playerUsable": true,
    "when": "resources.uses >= 1",
    "changes": [
      {"target":"resources.uses","value":"resources.uses - 1"},
      {"target":"module.enabled","value":"true"}
    ]
  }],
  "outputs": [
    {"target":"melee","duration":"short","bonusType":"unnamed","value":"mod.charisma"},
    {"target":"ranged","duration":"short","bonusType":"unnamed","value":"mod.charisma"},
    {"target":"damageReduction","duration":"short","bonusType":"unnamed","value":"classes.crusader.level * 2"}
  ],
  "notes": [{"text":"对目标额外＋1借机次数"}]
}
```

伤害减免尚未约定基础公式，紧凑卡显示「伤害减免加值」合计；不把附加值冒充未定义的基础值。次数恢复先用资源输入手动处理。
Until the base DR formula is defined, the compact card shows total DR adjustments. Restore uses manually through resource inputs.

本次无需新数据库列；状态继续随原有导出保存。云端使用前重新生成共享运行时并部署module-state；本地直接使用。
No new database columns are required. Existing exports retain state. Regenerate the shared runtime and redeploy module-state for cloud usage; local mode needs no deployment.

## 13. 能力获得记录 / Ability Acquisition Details

DM在「规则模块」→角色模块的每个已分配实例下填写这三项，然后点「保存角色模块」。玩家只读；这些字段属于该角色获得的实例，不会修改其他角色共用的模板。
The DM edits these fields beneath each assigned instance in the module sidebar and saves character modules. Players have read-only access. Fields belong to character assignments, not shared templates.

|字段 / Field|中文 / Meaning|
|---|---|
|`prerequisites`|能力先决条件，自由文字 / Prerequisites, free text|
|`source`|能力来源，自由文字 / Source, free text|
|`acquiredLevel`|能力获得等级，仅整数 / Acquisition level, integer only|

文字字段最多2000字。旧记录可暂不填写，显示「未填写」。「能力列表」在专长、职业能力、种族能力、其他能力各自分类内按获得等级从低到高排序；同等级保留原顺序，未填写等级的排在该分类末尾。不会混排分类。速算卡点开能力详情也可查看这些记录。
Text fields allow up to 2000 characters. Existing records may remain unfilled. The ability list sorts ascending within each existing category; ties retain their original order and missing levels appear last. Categories are never mixed. Selected ability details also display the fields.

这三项仅用于记录与排序，不会自动检查先决条件，也不会按获得等级自动启停能力。随角色状态保存和导出，无需新增数据库列。云端使用前需同步部署module-state共享引擎，保持DM专属修改限制。
These fields document and sort abilities; they do not enforce prerequisites or automatically activate abilities by level. They persist in existing character state and exports without new database columns. Redeploy the shared cloud engine to enforce DM-only edits remotely.

## 14. 通用防御、友军授予与接收 / Common Defense and Granted Effects

### 防御公式 / Defense Formulas

在GM规则模块栏「阵营与防御基础」填写盔甲、盾牌、天生防御、偏斜、体型以及盔甲允许的敏捷上限。数值默认0；敏捷上限留空表示不限。不会读取旧版未使用的ac字段，也不会根据种族体型自动猜体型加值。
In the GM sidebar, configure armor, shield, natural armor, deflection, size and armor’s Dexterity cap. Contributions default to zero; a blank cap means unlimited. The legacy ac field is not reused and numeric size modifiers are not inferred from race labels.

```text
有效敏捷 = MIN(mod.dexterity, 盔甲敏捷上限)
防御 = 10 + 有效敏捷 + 盔甲 + 盾牌 + 天生防御 + 偏斜 + 体型 + 适用来源
接触防御 = 10 + 有效敏捷 + 偏斜 + 体型 + 适用来源
措手不及防御 = 10 + MIN(0, 有效敏捷) + 盔甲 + 盾牌 + 天生防御 + 偏斜 + 体型 + 适用来源
```

基础数值按其类型和来源一起比较：盔甲armor、盾牌shield、天生防御natural_armor、偏斜deflection、体型size。不把同类型来源重复直接相加。每项结果最终向下取整；敏捷上限只限制防御中的敏捷贡献，不限制反射豁免。
Base contributions enter the same typed stacking calculation as other effects. Do not add competing typed bonuses twice. Each final result is floored. The Dexterity cap applies only to defense contributions, not Reflex saves.

`defenseCommon` 一条输出同时适用于三种防御，每种只计一次；`defense`、`touchDefense`、`flatDefense` 是各自专属来源。每项先把通用、专属、适用基础来源合并，再执行同类叠加。例如洞察通用+4与接触专属洞察+6，在接触中取+6，不是+10。环境和无名仍可叠加。通用表示明确适用于三项，不单凭bonusType推测适用范围。
A defenseCommon output applies once to each defense. The other three targets are specific. Merge common, specific and applicable base sources before stacking. Insight +4 common and insight +6 touch yield +6 to touch. Circumstance and unnamed still stack. Applicability is explicit rather than inferred from bonus type alone.

### 援护示例与目标 / Aid and Targets

加载「援护示例」→保存定义→分配给来源角色→设为PL可启停→保存。默认授予所有友军且不包括自己。接收者打开速算卡「收到的效果→友军」，勾选「被援护」，再保存操作。也可在「当前状态」接受并保存。
Save and assign the Aid sample to its source with player toggle permission. It targets all allies except self by default. Recipients accept Under Aid in Received Effects → Allies and save. Acceptance is also available on the Current State page.

[完整示例 / Full example](examples/aid.json)

```json
"grant": {
  "name": "被援护",
  "group": "ally",
  "mode": "all",
  "includeSelf": false,
  "outputs": [
    {"target":"defenseCommon","duration":"short","bonusType":"circumstance","value":"4"},
    {"target":"reflex","duration":"short","bonusType":"circumstance","value":"4"}
  ]
}
```

|字段 / Field|含义 / Meaning|
|---|---|
|`grant.name`|接收者看到的效果名 / Received effect name|
|`grant.group`|ally同阵营友军；other不同阵营角色 / Same-team allies or other teams|
|`grant.mode`|all所有；single单个；multiple多个 / All, single or multiple targets|
|`grant.includeSelf`|是否允许自己成为目标，默认否 / Include self, default false|
|`grant.outputs`|1–64条输出，只作用于被选中且已接受的角色 / Outputs for selected, accepting recipients|
|实例 `targets`|single/multiple时所选角色id数组 / Selected character ids|

单选或多选模式下，来源能力详情出现目标选择栏。all模式按阵营筛选。阵营字段在角色rule_state.team中，DM可编辑，默认party；同名为友军，区分大小写。玩家不能改阵营。includeSelf只解除自身排除，不改变阵营筛选。
Single/multiple modes display a target selector in the source’s ability details. All mode filters by team. GM controls rule_state.team; the default is party. Equal, case-sensitive team strings are allies. includeSelf removes self-exclusion without bypassing team filtering.

距离、攻击范围、敌我特殊情况以及其他接受条件由DM现场判断。网站不测距。目标选择和同意接受是两件事：玩家可以选择授权能力的目标，但不能强制别人接受。
Range and situational eligibility are adjudicated at the table. Targeting does not force acceptance.

### 来源与生命周期 / Source and Lifecycle

原模块outputs仍只作用于自己；grant.outputs只作用于接收者，使用来源角色自己的参数、资源、职业等级和属性计算。为避免互相强化产生计算循环，目前授予值从来源自身模块状态计算，不把它收到的其他授予效果再传递放大。接收者的普通卡片计算会把已接受来源与本地来源一起合并。
Normal outputs affect self; grant.outputs affect recipients using the source’s own context. To avoid feedback loops, outbound values use the source’s own module state without propagating incoming grants into further grants. Recipient card calculations merge accepted and local effects.

来源关闭、移除、删除或不再将角色列为目标时，效果自动停止。取消接受只影响自己的卡。接收状态按来源角色id＋能力实例id保存；同一来源回来时保留之前的接受选择。新分配的实例是新的来源，默认尚未接受。不同来源分别显示，按类型叠加；两份环境+4可合计+8。
Effects disappear when the source is disabled, removed, deleted or no longer targets the recipient. Acceptance affects only that recipient. Choices persist per source character and instance. Reassigned instances are new sources and require acceptance. Two accepted circumstance +4 effects stack to +8.

只保存目标与接受开关，不把计算结果复制进接收者的手工来源。`rule_state.acceptedEffects`保存接受状态；所有状态随完整JSON导出。玩家只能修改自己的接受开关，以及获准能力的目标；GM可代为操作。
Only targeting/acceptance state is stored; generated values are not copied into manual sources. Acceptance lives in rule_state.acceptedEffects and is included in exports. Players edit only their own acceptance and permitted source targets; GM may act for them.

### 本地与云端 / Local and Cloud

本地模式直接跨本机角色计算，切换测试账号即可验证。云端需迁移011_shared_effect_signal.sql并部署最新module-state；该服务仅返回角色名、阵营和有权接收的效果数值，不向玩家开放其他角色完整数据。实时信号只公布刷新计数，来源更新后重新计算效果。真实Supabase部署尚未实测。
Local mode computes across locally stored characters. Cloud mode requires migration 011 and the latest module-state. The service returns a minimal name/team roster and effects for authorized recipients, not foreign character records. A shared invalidation counter refreshes effects without exposing source state. Live Supabase deployment has not been verified.

备忘录条件示例 / Conditional note example: `"when": "current.hp < 0"` 只在当前生命小于0时显示，0或正值时隐藏，生命草稿及结算更新会重新判断。模块id应写 `"diehard"`，不要把Markdown加粗符号写进id。 / Shows only below zero and updates with HP drafts or settlement. Use the plain id diehard without Markdown bold markers.

## 15. 角色技能、本职对应表与新增种族 / Character Skills, Class Lists and Custom Races

左侧「技能列表」先选角色，再填写本职和跨职两个投入框，点保存。每个角色分别保存在自己的 `rule_state.skills`，不会更改其他角色。玩家可编辑自己的投入，DM可编辑全部角色。
Select a character on Skills, edit the two investment columns and save. Values live in that character’s rule_state.skills. Players edit their own character; GM can edit all characters.

```json
"skills": {
  "disable_device": {"class": 5, "cross": 7},
  "perform": {"class": 7, "cross": 5}
}
```

每项本职投入上限＝将该技能列为本职的职业等级总和＋3（仅初始职业也列为本职时）；本职与跨职合计上限＝角色总等级＋3。任何技能均可用跨职点，不能用本职点超过该项本职上限。初始职业指逐级履历中的第一个职业，其后再兼职回来时等级仍累计到该职业。各技能使用的本职点、跨职点分别合计，不得超过对应可用池。投入为非负整数。
Class-funded cap equals levels in all qualifying classes, plus 3 if the initial class qualifies. Total ranks cap at total level + 3. Cross-funded points may be used for any skill. The initial class is the first entry in the level history. Each funding pool has a separate total budget. Investments must be non-negative integers.

例：初始机关术师2级、后续巫女7级，解除装置本职上限5；表演上限7；共同本职的制造/维修物品上限12。三者总投入上限均12。不是本职的技能也可用12跨职点。若预算池未配置则不能投入对应点数，先在DM计算配置补齐基础技能点及主属性。
Example: Artificer 2 first, then Shrine Maiden 7 gives class-funded caps 5 for Disable Device, 7 for Perform and 12 for shared Craft/Repair. All have total cap 12. Non-class skills may still use 12 cross-funded points. Configure skill budgets and primary abilities before spending from an unconfigured pool.

当前检定加值＝总投入＋对应属性调整。逐技能的额外来源、训练限定和战斗状态尚未添加，不会推测这些规则。
Current checks equal ranks plus the associated ability modifier. Per-skill extra effects, trained-only restrictions and combat conditions remain for later configuration.

DM计算配置→「职业本职技能」：展开职业、按属性分组勾选技能，再保存。数据是 `mechanics.config.classes.<职业id>.classSkills` 的技能id数组。新增职业默认无本职，手工勾选即可。修改本职对应表不会删除已有投入；超出新上限时在技能表提示，调整后再保存。未填过本职表的旧配置会补入本次清单，已经明确设置的空表或自定义表不会被覆盖。
Under DM Configuration → Class Skills, expand a class, edit the checkboxes and save. The classSkills array stores stable skill ids. New classes start empty. Editing a class list preserves investments and flags values above new caps. Old missing lists receive the supplied defaults; explicit empty/custom lists are preserved.

本次名称归一：骑兵对应原重骑兵；制造物品、制造维修、维修制造对应「制造/维修物品」；法术辨识对应辨识法术；滚翻对应翻滚；知识名称对应原有知识分项；重复估价只保留一次。战刃的「重型武器」已按用户更正记为攻城武器。重骑兵未额外加入侦察或生存；巫女包含全部10项知识。
Names are normalized to existing definitions. Cavalier uses the existing class. Craft/repair aliases share one skill, Spellcraft and Tumble aliases map to their existing entries, and duplicate Appraise is removed. Warblade’s Heavy Weapons typo was corrected to Siege Weapons. Cavalier does not gain Spot or Survival automatically; Shrine Maiden has all ten Knowledge skills.

[本职默认对应表 / Default class-skill mappings](examples/class-skills.json)

DM计算配置底部新增种族名称，加入草稿后填写体型、移动速度和单位，再保存。角色档案的种族下拉框会显示新种族。原四种族保留；新增种族不是另存一个角色。当前种族名称作为固定键，先不提供改名/删除，以免断开现有角色关联。
Add a race name in DM Configuration, fill size, speed and unit, then save. It appears in character race selectors. The original four races remain. Race names are stable keys; rename/delete is not provided yet.

本地数据随现有完整导出保存。云端需要迁移012_class_skills_custom_races.sql并重新部署module-state。服务器会校验玩家的投入上限及预算，新增种族也受数据库校验；真实Supabase尚未部署验证。
Local data is included in full exports. Cloud usage requires migration 012 and redeployment of module-state. The server checks investments/budgets and database constraints validate custom races. Live Supabase deployment is unverified.

## 16. 首级技能点四倍 / First-Level Skill Points ×4

本职与跨职的技能点总量，角色第1级均按4倍计算，包含该级的属性调整；之后每级按正常值。不是每次取得一个新职业都再给4倍。等效算法是在原总量上额外加3份初始职业的每级贡献：
Both budgets multiply the character’s first level by four, including its ability modifier. Later levels use normal rates. Taking a new class does not grant another ×4. Equivalently, add three extra copies of the initial class’s one-level contribution:

```text
本职总量 = Σ((职业本职基础 + 该职业主属性调整) × 职业等级)
         + 3 × (初始职业本职基础 + 初始职业主属性调整) + 长效来源
跨职总量 = Σ(职业跨职基础 × 职业等级) + 智力调整 × 角色总等级
         + 3 × (初始职业跨职基础 + 智力调整) + 长效来源
```

长效来源不乘4，中间保留小数，最终取整。此变更只影响可用技能点总量，不改变各项投入上限、不清除或自动分配已有投入。所有属性仍指调整值。无职业等级时不发首级奖励。本文前面未写首级额外贡献的旧总量表达式，以本节为准。
Long effects are not multiplied. Preserve intermediate decimals and floor the final total. Investment caps and saved investments remain unchanged. No levels means no first-level award. This section supersedes earlier budget expressions that omit the first-level bonus.

## 17. 技能变量、能力强化与情境加值 / Skill References, Enhancements and Contextual Bonuses

全部57项技能有固定字段，编辑栏「技能变量与强化目标」可复制。技能中文名与字段名完整对应见 [技能字段CSV](examples/skill-fields.csv)，可用表格软件打开。
All 57 skills expose stable references. Copy them from Skill References and Targets in the editor. The CSV maps display names to keys.

以跳跃 `jump` 为例：
Using Jump as an example:

|引用 / Reference|含义 / Meaning|
|---|---|
|`skills.jump.class`|本职投入 / Class-funded ranks|
|`skills.jump.cross`|跨职投入 / Cross-funded ranks|
|`skills.jump.ranks`|两类投入之和 / Total invested ranks|
|`skills.jump.modifier`|对应属性的最终调整值 / Associated adjusted ability modifier|
|`skills.jump.base`|投入＋属性调整，不含技能额外来源 / Ranks plus modifier before skill bonuses|
|`skills.jump.total`|加入长效、短效、已接受的友军技能效果后的通常检定加值，最终取整；不含情境限定项 / Final normal check, including typed effects, excluding contextual entries|
|输出目标 `skill.jump`|给跳跃添加一条加值来源 / Add a Jump bonus source|

注意：读取时前缀是skills复数，输出目标是skill单数。这些引用可用于variables、输出、when、备忘和按钮公式；不能直接写入投入或最终值，也不开放到资源初始值/范围和参数范围。修改投入仍走技能表的上限及点池校验。
Read references use plural skills; output targets use singular skill. References work in computed variables, outputs, conditions, notes and actions. They do not allow direct writes to ranks/final totals or use in initialization/bounds. Rank edits retain normal caps and budgets.

### 强化一个技能 / Enhance a Skill

专长或职业能力的outputs里加入：
Add an output to a feat/class module:

```json
{"target":"skill.jump","duration":"long","bonusType":"insight","value":"2"}
```

此项强化检定，不增加投入、不占总投入上限、不消耗任何点池。可同时有长效/短效，并与已接受的友军技能效果按既定19种类型一起叠加；技能表可展开来源查看保留/被压制原因。
This modifies checks, not ranks, caps or budgets. Long/short and accepted ally effects share the existing typed stacking rules. Expand the skill’s bonus cell for source details.

其他能力可读取强化后的值，例如伤害加值公式 `FLOOR(skills.jump.total / 5)`。读取总投入则用ranks，不能用total冒充训练点数。
Other abilities can read the enhanced total, for example FLOOR(skills.jump.total / 5). Use ranks for training thresholds, never total.

### 共效门槛与情境 / Synergy Thresholds and Context

共效门槛按用户确认是**本职＋跨职投入≥5**：
The confirmed threshold is total invested ranks at least five:

```text
skills.<来源技能id>.ranks >= 5
```

以下只演示写法，不预置任何真实技能对应关系，也不替DM决定共效的加值类型：
The following is syntax only. It does not install a real synergy mapping or determine the DM’s bonus type:

```json
{
  "target": "skill.jump",
  "duration": "long",
  "bonusType": "unnamed",
  "value": "2",
  "when": "skills.balance.ranks >= 5"
}
```

需要情境限定时加上自由文字context：
For a situational bonus, add a free-text context:

```json
{
  "target": "skill.jump",
  "duration": "long",
  "bonusType": "unnamed",
  "value": "2",
  "when": "skills.balance.ranks >= 5",
  "context": "某个指定情境（示例）"
}
```

技能输出可使用context，最多200字。条件成立后，技能旁显示该情境的检定合计及相对通常值的变化；平时的total不包含它。该合计会合并通常来源与相同context的来源，再处理类型叠加，因此不会把被压制的加值误加进去。多个不同情境分别列示，不自动断言它们同时满足；可在技能旁的情境试算中勾选多个，计算同时满足时的合计。不同模块若使用相同情境文字，会归为同一情境计算。
Context applies only to skill outputs and allows up to 200 characters. The skill row displays that context’s total and delta when its when-condition holds. Normal total excludes it. Each contextual total merges normal and matching-context sources before stacking. Distinct contexts are shown separately; manually select multiple contexts in the row’s preview to calculate their combined total. Identical context text groups matching effects together.

`when`是程序能判断的条件；`context`是现场由人判断的适用描述。`bonusType:"circumstance"`是环境加值类型，和context的“特定情境”是两件事；有情境的加值也可以是洞察或其他类型。
When is a machine-evaluated condition; context is a situation adjudicated at the table. The circumstance bonus type and a situational context are independent concepts.

共效或强化不会把来源技能投入抬高，因此不会通过“加值变成新投入”触发共效链。真正读取其他技能total的计算链允许，但一个技能依赖自己最终值、或几个技能最终值互相循环会被拒绝；可改读ranks/base。修改六大属性的效果只能读技能投入，不能读其modifier/base/total以免形成属性反馈。
Bonuses never become ranks or trigger training thresholds. Non-cyclic final-total chains are supported. Self/cyclic final-total dependencies are rejected; read ranks/base instead. Ability-score-changing outputs may read invested ranks, but not skill modifier/base/total.

已按第18节录入用户提供的54条固定共效；它们与本节的自定义技能加值接口共用同一套检定计算。模块及状态仍走原有保存/备份；云端需同步重新部署最新module-state，无需新增数据库列。
The 54 fixed synergy mappings in section 18 are now installed and share this skill-effect calculation. Existing save/export structures remain in use. Redeploy the shared cloud runtime; no new database columns are required.

## 18. 已录入的54条技能共效 / The 54 Installed Skill Synergies

用户提供的54条共效已作为所有角色共用的规则表录入，其中31条无情境限制，23条有情境限制。无需给每个角色分配一个共效能力。来源技能本职＋跨职投入达到5点时，该条自动产生固定+2；所有共效使用可累加的无名来源，保留各自来源名称。
The user’s 54 synergies apply globally: 31 unconditional and 23 contextual. No per-character ability assignment is needed. Each rule activates at five invested ranks and contributes exactly +2 as a stacking unnamed source.

[完整中文共效表CSV / Full readable mapping](examples/skill-synergies.csv) · [完整规则JSON / Full definitions](examples/skill-synergies.json)

名称归一：唬骗与哄骗统一为bluff；驯兽对应驯养动物；使用魔法装置对应UMD；维修物品对应制造/维修物品；各知识简称对应已有知识分项。只做名称对应，情境文字保持原意，没有额外加入标准规则。
Aliases map to the existing skills; contextual wording retains the supplied meaning. No additional standard-rule synergies are inferred.

无条件共效直接计入通常检定。情境共效列在目标技能名称下，显示该情境合计与相对通常值的变化。例如文件解读与辨识法术各投入5点时，UMD通常值不增加，目标为卷轴时合计额外+4。
Unconditional effects enter normal checks. Contextual rows show the scenario total and delta. With five ranks in both Decipher Documents and Spellcraft, UMD gains no normal bonus but gains +4 for scroll targets.

多个不同情境同时适用时，展开「多个情境同时满足时试算」，由玩家勾选实际满足的情境。试算会合并所有选中情境的来源并按类型叠加，不是简单把各个情境总值相加。试算选择只用于当前技能页面，不保存成角色状态，也不改变公式读取的skills.*.total；后者始终是通常检定。
For simultaneous situations, expand the row preview and select the applicable contexts. It merges matching sources before typed stacking instead of adding complete scenario totals together. Preview selections are transient and do not alter saved state or the normal total exposed to formulas.

例如：哄骗、察言观色、贵族知识均5点时，交涉无条件+6。生存同时满足地下城、野外避免迷路/自然危险、自然环境、追踪足迹四项时，四个已解锁的情境共效可在试算中合计+8；这些情境是否能同时成立由人脑判断。
For example, Bluff, Sense Motive and Knowledge Nobility each at five ranks give Diplomacy +6. Four unlocked Survival contexts can preview +8 when all are selected; actual compatibility is adjudicated at the table.

翻滚↔跳跃、会计↔数学等双向共效只看投入，不读取彼此最终值，所以不会产生循环，也不会因+2导致新共效继续触发。强化、临时属性变化不替代训练投入。
Reciprocal synergies read ranks, so Jump/Tumble or Accounting/Mathematics never form feedback loops. Bonuses and temporary modifiers do not become training ranks.

规则保存在mechanics.config.skillSynergies，形状为：
Rules live in mechanics.config.skillSynergies:

```json
{"id":"bluff__diplomacy","source":"bluff","target":"diplomacy"}
```

情境项额外带context文字。门槛和加值统一固定为5与2，不从单条规则改数值。旧配置缺少该字段时自动使用这份54条默认表；完整导出会包含规则表。已经明确设置的表（包括空数组）会保留。技能投入和结果分别保存/计算，反复刷新不会重复累加。
Contextual entries add context text. Threshold five and bonus two are fixed centrally. Missing legacy configuration receives the default table; explicit tables, including empty ones, are preserved. Full exports include the table. Recalculation replaces generated contributions rather than adding duplicates.

本次无需数据库迁移；云端需重新部署包含skill-synergies共享运行时的module-state。本地直接生效。
No database migration is required. Redeploy module-state with the updated shared runtime for cloud use; local mode works immediately.

## 19. 三类备忘录 / Three Note Categories

速算卡与当前状态均显示三栏：战斗备忘、负面备忘、非战斗备忘。电脑并列，窄屏纵向排列。旧备忘不用改，未填写category时默认combat，原有when与启停规则不变。
Both cards display Combat, Negative and Noncombat notes in three desktop columns, stacking on narrow screens. Existing notes default to combat; conditions and activation are unchanged.

```json
"notes": [
  {"text":"战斗中的提醒","category":"combat"},
  {"text":"生命为负时的负面提醒","category":"negative","when":"current.hp < 0"},
  {"text":"探索或社交中的提醒","category":"noncombat"}
]
```

分类写在每条备忘上，同一模块可向三栏分别添加多条。专长、职业、种族、物品、法术、其他模块均可使用。显示保留来源名称，条件不成立或来源关闭时消失；分类只控制位置，不自动施加负面数值或消耗资源。
Category is per note. Every module category can contribute to any of the three columns. Source labels remain visible; notes disappear when their conditions fail or their source is disabled. Categories affect placement only, not stats or resources.

无需新数据库迁移；完整配置备份保留category。云端使用需同步重新部署module-state共享运行时。
No new migration is required. Exports preserve the category; redeploy the shared runtime for cloud usage.

## 20. 状态规则与自定义JSON / Conditions and Custom JSON

速算卡「玩家操作」底部的「状态」默认收起。手动勾选后点击「保存操作」。已录入DM提供的32个效果状态，另有飞行、游泳、钻地、冲锋4个运动占位；占位本身不增加数值，但飞行标记参与被吹动、受阻、吹倒的分支判断。
Expand Conditions below Player Controls, toggle a flag, then Save Operations. There are 32 DM-defined effect conditions and four movement placeholders: fly, swim, burrow and charge. Movement flags add no unconfirmed benefits; fly selects the airborne branches of wind effects.

[完整默认状态JSON / All default definitions](examples/conditions.json)

DM计算配置 →「状态定义 · 编辑／新增JSON」：选已有状态修改，或选「新增状态」，校验并加入草稿，最后保存整份配置。相同id覆盖默认定义；新增id会出现在所有角色的状态选择区。已有id不可直接重命名，以免破坏角色引用。自定义定义保存于mechanics.config.conditions；角色开关保存于rule_state.conditions；完整备份会保留这两部分。旧存档缺少定义时使用内置规则，原有布尔开关保留。
In DM Calculation Configuration, edit an existing condition or create one, validate it into the draft, then save the full configuration. Matching IDs override defaults; new IDs appear for every character. Definitions live in mechanics.config.conditions, flags in rule_state.conditions, and both are included in exports. Legacy saves use defaults without losing their flags.

```json
{
  "id": "custom_slow",
  "name": "迟缓示例",
  "english": "Custom Slow",
  "outputs": [{"target":"melee","value":-2,"bonusType":"unnamed"}],
  "speedMultiplier": 0.5,
  "notes": [{"text":"由DM判断何时解除。","category":"negative"}]
}
```

| 字段 / Field | 用法 / Meaning |
| --- | --- |
| id / name / english | 固定英文标识、中文名称、英文名称；必填。Stable ID, display name and English name; required. |
| description | 可选说明文字。Optional description. |
| outputs | 数值来源数组；target沿用模块目标对应表，value为数字，bonusType可省略，默认unnamed。Numeric modifiers using existing module target names and bonus types. Values are numbers, not formulas. |
| skillModifiers | 技能数组；value为数值，ability可筛选关联属性，skills可列技能id；均省略时适用所有技能，同时填写则取交集。Filter by governing ability and/or skill IDs; omit both for all skills. |
| abilitySet | 如{"dexterity":0}；在其他加减之后直接设定最终属性，不改天生值。多来源设值取最低值；取消后恢复计算。Override final scores after modifiers; minimum override wins. |
| loseDex | true时三个防御失去正的有效敏捷贡献，保留负数。Remove positive Dexterity contributions, retaining penalties. |
| speedMultiplier | 0至1；多个状态取最低倍率，两个0.5仍只减半一次。Use the lowest active multiplier; half speed does not compound. |
| autoFailSkills | 技能id数组，如["listen"]；表中标注自动失败，原检定数值仍保留供引用。Mark automatic failure without replacing the numeric check value. |
| implies | 如[{"id":"prone","when":"!conditions.fly"}]；when可省略，仅引用状态布尔值。Linked flags with optional boolean condition expressions. |
| upgrade | 如{"count":2,"id":"exhausted"}；出现「再次…」按钮。达到次数后本状态效果由目标状态代替。Repeated application upgrades to another condition instead of keeping its own effects. |
| defenseContexts | 如[{"id":"ranged","label":"对抗远程武器","value":4}]；三个防御分别显示该情境总值，不污染通用防御。Show separate defense totals for each attack context. |
| notes | text、category、可选when；category为combat/negative/noncombat，省略默认negative。Conditions may contribute to all three memo columns. |

skillModifiers示例：
Skill modifier examples:

```json
[
  {"ability":"strength","value":-4},
  {"ability":"dexterity","value":-4},
  {"skills":["search"],"value":-4}
]
```

以上分别对应力量技能、敏捷技能、搜索。不同数组项是独立来源，重叠时会相加；固定状态数值接入现有加值类型叠加规则，默认无名允许累加。本职/跨职技能点输出记为长效，其余状态数值记为短效。不依据标准规则额外推断恐惧等状态之间的互斥或升级。
The rows affect Strength skills, Dexterity skills and Search separately. Overlapping rows stack as separate sources. Existing typed stacking applies, with unnamed as the default. Skill-point budget outputs are long-term; other condition modifiers are short-term. No additional standard-rule fear hierarchy is inferred.

联动状态显示来源，手动勾选框只记录手动选择。例如濒死→昏迷→无助、麻痹→无助。取消来源会撤销其联动，但手动勾选的目标状态或其他来源仍保留。疲乏的「再次疲乏」会使其转为力竭，不再叠加原疲乏的−2；取消疲乏勾选会清除这次来源的转换，单独勾选的力竭仍保留。联动循环和未知状态引用会被拒绝。
Derived conditions retain their source. Clearing a source removes only its links; manual flags and other sources remain. Applying Fatigued again upgrades it to Exhausted and replaces the original −2. Clearing Fatigued removes that upgrade source without clearing a separately selected Exhausted. Cycles and unknown references are rejected.

能力公式可读取所有生效状态，包括联动与自定义状态，如conditions.flat_footed、conditions.fly。侧栏「战斗状态变量」会列出完整对应表。value、when、variables、notes.when与按钮公式可读取；资源初始值/边界与参数边界仍只允许稳定变量。
Ability formulas can read every effective flag, including derived/custom flags. The sidebar lists their paths. They are available in outputs, variables, notes and actions, but not stable initialization or bounds.

```text
IF(conditions.flat_footed, 0, MIN(classes.warblade.level, MAX(0, mod.intelligence)))
```

自动失败、失手概率、施法失败概率、随机距离/伤害、回合扣血、行动限制、困惑百分率分支都只作备忘，不会掷骰或自动改变当前生命。敌方失去敏捷或攻击你的命中加值也只提醒，不会擅自修改另一角色。技能的skills.<id>.total保留数字，自动失败单独显示。先攻基础公式尚未定义，因此速算卡显示「先攻调整」；耳聋的−4已计入，当前状态仍注明基础待配置。速度减半作用于种族基础移动速度；其他模块的速度附加值仍单列，合并顺序待DM定义。
Automatic failure, miss/spell-failure chances, random distance/damage, per-turn HP loss, action restrictions and Confused branches remain reminders. The app does not roll or automatically change current HP or another character. Skill totals remain numeric. Initiative has no agreed base formula yet; the compact card shows its adjustment, including Deafened’s −4. Speed multipliers apply to racial base speed; separate module speed bonuses await a DM-defined merge order.

无需新增数据库列；本地保存立即可用。云端使用需重新部署包含conditions及condition-effects的module-state共享运行时。
No new database columns are needed. Local saves work immediately; cloud use requires redeploying module-state with the updated shared runtime.

## 21. 装备位置 / Equipment Slots

装备页已包含武器、副武器、盔甲、盾牌、手腕、内袍、面部、脚部、手部、头部、左手戒指、右手戒指、肩外袍、颈部、躯干衣、腰部、特殊。点击「增加特殊位置」可追加位置；额外位置可以移除，装备本身仍保留。
The equipment page provides all 17 named slots. Add Special Slot creates another independent slot; removing a slot keeps the assigned item in inventory.

GM在规则模块的「装备模板」选择类型，填写唯一id和名称，保存定义，再分配给角色。所有装备使用category:"item"，equipmentSlot类型如下。角色只能选择自己已分配且匹配位置的装备；空选项表示未装备。
Choose an Equipment Template type, set a unique ID/name, save the definition, then assign it to a character. Items use category item and one of these equipmentSlot types. Only assigned compatible instances are selectable.

| 位置 / Slot | equipmentSlot |
| --- | --- |
| 武器、副武器 / Weapon, secondary weapon | weapon |
| 盔甲 / Armor | armor |
| 盾牌 / Shield | shield |
| 手腕 / Wrists | wrists |
| 内袍 / Inner robe | inner_robe |
| 面部 / Face | face |
| 脚部 / Feet | feet |
| 手部 / Hands | hands |
| 头部 / Head | head |
| 左右戒指 / Either ring | ring |
| 肩外袍 / Shoulders | shoulders |
| 颈部 / Neck | neck |
| 躯干衣 / Torso | torso |
| 腰部 / Waist | waist |
| 特殊 / Special | special |

戒指可以在左右手任意选择，或点击「左右戒指互换」。选择已戴在另一手的戒指时会交换；同一装备实例不能重复占位，多个同款实例则分别选择。武器与副武器亦可互换，同一把武器不会重复放置。
Rings fit either hand; use Swap Rings or select the opposite ring to exchange them. Each instance occupies one slot; distinct copies remain independent. Weapons may move between the main and secondary slots.

选择保存在各角色rule_state.equipment，各位置值为实例id，空字符串表示未装备。武器原有weapon字段保留，副武器键为secondary_weapon，戒指为left_ring/right_ring；其他固定键与表中类型相同，新增特殊位置使用special_前缀的独立标识。保存、导出沿用现有数据结构，无需新数据库列。
Selections live in each character's rule_state.equipment. Values are instance IDs or empty strings. Legacy weapon selections remain valid. Secondary weapon uses secondary_weapon, rings use left_ring/right_ring, additional special slots have independent special_ keys. Existing persistence and exports require no new database columns.

本次仅接入位置与保存；不会自动启停原有装备模块，也暂不改变weapon.two_handed。装备属性和效果联动将在后续确定。云端使用需重新部署module-state共享运行时。
This step stores slot selections only, without toggling item effects or changing weapon.two_handed. Attribute/effect integration follows later. Cloud use requires redeploying the shared module-state runtime.

## 22. 技能点池与临时属性 / Training Budgets and Temporary Scores

本职技能点中的职业主属性、跨职技能点中的智力，统一使用「天生值＋长效属性来源」计算调整值。短效属性来源及状态临时设值不影响点池；筛选长效来源后再处理同类加值叠加，短效增强不会把长效增强挤掉。首级4倍、兼职权重及直接增加技能点的长效来源保持原算法。
Class-point primary scores and cross-class Intelligence use innate scores plus long-term sources only. Short-term modifiers and condition score overrides do not change budgets. Long-term sources stack independently of short-term sources. First-level ×4, multiclass weighting and direct long-term point adjustments are unchanged.

技能检定、命中、豁免、生命等仍使用最终属性；单项技能投入上限继续由职业等级与本职资格决定，不受属性影响。以后装备属性应按既定规则放在短效来源，才会自动排除在技能点池之外。无需改写现有角色或能力JSON。
Skill checks, attacks, saves and HP still use final scores. Rank caps remain level/class based. Equipment score bonuses should be short-term sources to exclude them from training budgets. Existing character/module JSON requires no migration.

## 23. 巨剑基础资料与武器标签 / Greatsword Profile and Weapon Tags

右侧规则模块点击「这把巨剑模板」，保存定义、分配给角色，再到装备页武器下拉框选用并保存。模板为小型＋2巨剑·猛击·警戒·笼手·剃刃·锯齿，基础阶段不产生附魔加值。
Use This Greatsword Template, save its definition, assign it, then equip and save on the character equipment page. This first stage stores the profile without applying enchantment modifiers.

[完整模板JSON / Complete template](examples/greatsword.json)

模块tags为可手动编辑的字符串数组，已知标签：two_handed＝双手、melee＝近战、ranged＝远程、magic_weapon＝魔法武器。允许自定义标签。带＋的武器录入时应附magic_weapon，但程序不强制自动添加，DM可以修正。标签本身不自动产生数值加值。
Tags are editable strings. Known tags are two_handed, melee, ranged and magic_weapon; custom tags are allowed. Include magic_weapon when authoring enhanced weapons, but there is no enforced automatic tagging or implied numeric bonus.

weapon字段：baseDamage为该武器在size体型下的起始伤害骰。小型巨剑现在是1d10，当前伤害统一通过房规序列计算。旧sizeDamage、damage与damageNote作为兼容资料保留，不再用于覆盖自动计算。enhancement为增强等级，criticalWidth为威胁范围宽度（显示21−x到20），criticalMultiplier为暴击倍数。
The baseDamage field is the starting dice at the weapon's recorded size. The Small greatsword now starts at 1d10. Current damage uses the house progression; legacy sizeDamage/damage metadata no longer overrides it. Enhancement remains metadata; critical width and multiplier retain their previous meaning.

主武器带two_handed时，自动清空并占用副武器位置；卸下后位置恢复可选。双手武器只放主武器位。weapon.two_handed此时来自选中武器，原手动开关同步显示且不可修改；未选武器时保留旧手动行为。其余附魔与特殊效果稍后逐项配置。
Equipping a two-handed main weapon clears and reserves the secondary-weapon slot; unequipping releases it. The legacy weapon.two_handed variable follows the equipped weapon and its checkbox becomes read-only. Without a selected weapon, the legacy manual behavior remains. Remaining enchantments/effects will follow separately.

## 24. 武器伤害档位与体型接口 / Weapon Damage Progression and Size Inputs

固定序列：1d1 → 1d2 → 1d3 → 1d4 → 1d6 → 1d8 → 1d10 → 2d6 → 2d8 → 3d6 → 4d6 → 6d6 → 8d6 → 12d6。
The ordered sequence above defines all 14 ranks. Aliases: 2d4 shares the 1d8 rank, 1d12 the 2d6 rank, and 2d10 the 3d6 rank. At zero adjustment, a special starting dice spelling is preserved; after moving, the destination's default spelling is used.

同档特殊骰型：2d4与1d8同档，1d12与2d6同档，2d10与3d6同档。未移动时保留武器的特殊骰型，移动后使用目标档的默认骰型。超出序列不会偷偷截断，会显示提示等待DM补规则。
Out-of-range movement shows a warning rather than silently clamping to the smallest/largest rank.

当前状态及速算卡新增「武器伤害」区，仅列已装备的主、副武器：当前伤害骰、起始骰、净变化档数、暴击范围与倍数。现阶段不合入固定伤害加值、额外伤害骰和附魔输出。
Both cards show equipped weapon dice, starting dice, net rank movement and critical profile. Fixed modifiers, bonus dice and enchantment integration remain separate follow-up work.

净变化档数＝角色种族当前体型与武器起始体型之差＋bodySize来源合计＋weaponSize来源合计＋GM手动调整。武器size是其起始体型，不是每次自动覆盖的当前值。高／长型属于同一体型档。旧记录缺少角色体型时会显示待配置，不猜数值。
Net movement is the character racial size minus the weapon's starting size, plus bodySize and weaponSize effect totals and manual GM adjustments. Tall/long variants share a size rank. Unknown sizes show a configuration warning.

这两个新数值输出目标沿用模块的long/short、when、bonusType与公式规则：
These numeric output targets use the existing duration, condition, stacking and expression engine:

| target | 用途 / Meaning |
| --- | --- |
| bodySize | 角色体型变化，用于本次武器伤害计算；尚不自动推导防御、触及或其他体型效果。Body-size changes for weapon dice only; no inferred defense/reach effects. |
| weaponSize | 只在武器伤害中视为体型变化，不改角色真实体型。Effective size changes for weapon damage. |

```json
{"target":"weaponSize","duration":"long","bonusType":"unnamed","value":"1"}
```

右侧「巨武招式模板」就是上述＋1档的常驻能力，保存并分配后，小型巨剑由1d10自动升为2d6。常驻能力不受实例enabled影响；需要开关可把mode改为toggle，再分配玩家启停权限。关闭或移除后重新计算，不修改原始伤害骰。
The Giant Weapon Stance template grants one effective size rank. Save and assign it to turn the Small greatsword's 1d10 into 2d6. Passive modules remain active regardless of enabled; use toggle mode for a switchable ability. Removal/disable recalculates from the original dice.

速算卡「玩家操作」中GM可展开「武器伤害体型调整」，手动填写真实体型变化、武器等效变化的档数并保存操作。保存在rule_state.sizeAdjustments.body/weapon；仅GM可改，能力提供的变化另外合计，避免把同一效果既手填又分配能力而算两次。
GM-only manual fields live in rule_state.sizeAdjustments.body/weapon. Module changes are added separately; do not enter the same effect through both paths.

[巨武招式示例 / Stance example](examples/giant-weapon-stance.json)。原始巨剑模板的2d6→1d8→2d6手工记录会被定向纠正为1d10起始；只有仍完整匹配旧示例资料的该id会迁移，自定义修改保留。旧存档和原JSON文件无需手工改写。
The exact old built-in prototype is narrowly corrected to 1d10; independently edited profiles are preserved. No new database columns are needed. Redeploy the updated module-state shared runtime for cloud use.

## 25. 装备加值、关键词与资源上限 / Equipment Effects, Tags and Resource Caps

装备模块现在只在该实例出现在角色equipment位置中时生效；卸下后来源撤销，角色原有能力启停规则保持。装备的enabled开关不替代装备位置。尚未配置效果的旧物品不会凭名称自动获得效果。
Item effects activate only while their instance is selected in an equipment slot. Unequipping removes those sources. Item enabled flags do not replace slot selection. Names alone never invent item mechanics.

武器输出增加scope:"weapon"，只允许melee/ranged/damage；省略scope仍表示角色通用效果。武器范围输出只进入该武器的攻击结果，不污染通用命中、通用伤害或其他武器。近战／远程／两用由武器tags中的melee/ranged决定，各自读取对应命中。来源与角色通用来源一起处理同类叠加，不能将两个已经合计的增强加值再直接相加。
Weapon-scoped outputs affect only that weapon and supported attack mode. Omitted scope remains character-wide. Sources merge before typed stacking, so an existing +4 enhancement suppresses the weapon's +2 rather than adding to it.

```json
{"target":"melee","scope":"weapon","duration":"short","bonusType":"enhancement","value":"2"}
```

此巨剑已经接入：命中／伤害＋2增强、先攻＋5洞察、剃刃伤害＋1无名；开启smite时，所属武器对应攻击的命中／伤害再＋2无名。笼手与特殊战斗尚未实现。现有巨剑若仍完整匹配旧的空效果模板，会定向补上这些效果；自行改写的非空outputs不会覆盖。
The greatsword now grants +2 enhancement attack/damage, +5 insight initiative, +1 unnamed damage, and a further +2 unnamed weapon attack/damage while smite is active. Gauntlet/disarm mechanics remain pending. Only the unchanged empty-effect prototype is automatically upgraded; authored outputs are preserved.

```text
tags.smite.owned
tags.smite.active
```

拥有＝角色已分配带smite标签的模块；开启＝常驻能力，或已启用的开关能力，装备则要求已选用。未拥有标签时公式读取false。标签路径区分大小写，建议小写英文标识。现有定罪会补上smite标签；如需移除可显式保存tags:[]。
Owned checks assigned modules; active checks passive/enabled abilities or equipped items. Missing tags read false. Paths are case-sensitive. Condemnation receives the smite tag by default; an explicit empty tags array opts out.

资源上限修正字段示例：
Resource maximum modifier example:

```json
"resourceMaxModifiers":[{"tag":"smite","value":"1","bonusType":"unnamed"}]
```

作为当前装备的来源，匹配角色所有带smite标签的能力资源，增加已有有限上限，不修改initial或当前次数。可加resource:"uses"限制资源键；省略则匹配该能力全部具有max的资源。卸下也不自动截断当前次数，超限会提示DM手动处理。无上限资源保持无上限。
The source modifies finite maxima of matching tagged modules, without altering initial/current values. Optional resource narrows the resource key. Unequipping never clamps counts; over-cap values are flagged for manual handling. Unbounded resources remain unbounded.

## 26. 持续备忘与角色刷新 / Timed Notes and Character Refresh

当前状态与速算卡的备忘下方，DM可展开「持续备忘」，新增任意记录或使用「锯齿备忘模板」，编辑名称、说明、分类、来源、剩余回合、每轮伤害，并保存。锯齿的1d4不自动掷骰，DM将掷骰结果填入剩余回合；模板先放1回合作占位。
The GM edits timed notes below the memo columns. Sawtooth is a template with one damage per round and an editable duration placeholder; roll 1d4 externally and enter the result. Nothing rolls automatically.

记录必须放在承受效果的角色上。每轮伤害为0时只倒计时／提醒。可绑定该角色自己的装备；未选用该装备时记录暂停，不生效也不递减。来自其他人的锯齿等效果填写来源说明并保持不绑定即可。可另选一个本角色的开关能力／法术，在倒计时到0时关闭它；不会关闭被动能力或卸下装备。
Place effects on the affected character. Zero per-round damage means timer-only. Optional own-equipment binding pauses the record while unequipped. Effects from other characters can use free-text source without binding. Optional expiresInstanceId disables a linked toggle ability/spell at expiration, never a passive module or equipped item.

每条记录保存在rule_state.timedEffects：
Each record lives in rule_state.timedEffects:

```json
{"id":"unique_effect_id","name":"锯齿","text":"每轮受到1伤害","category":"negative","source":"巨剑·锯齿","remaining":3,"perRoundDamage":1}
```

可选boundInstanceId绑定本角色装备实例；expiresInstanceId指定到期关闭的开关实例。DM可手工改轮数、文字、伤害或删除。记录0回合时从生效备忘中消失，但留在编辑区以便追溯／再编辑。
Optional binding and expiration targets use instance IDs. Expired records disappear from active notes but remain editable. Only the GM may author/edit records; the owning player may advance their own round.

「玩家资源」新增回合刷新及仅DM可见的战斗刷新。回合刷新按以下顺序一次性保存：本角色生效的每轮伤害→剩余回合减1→到期关闭关联开关→按round恢复规则设置资源。不会改变其他角色、自动新增锯齿目标、掷骰或恢复未配置资源。
Round refresh atomically applies this character's periodic damage, decrements timers, disables linked expired toggles, then applies declared round resource resets. It never advances other characters, creates attack targets or rolls dice.

资源定义可选refresh字段：
Optional resource reset declaration:

```json
"refresh":{"battle":"max","round":"initial"}
```

max为当前有效上限，initial为原始初始公式结果，数字为直接设置的当前值，均非额外加次数。未声明事件则不恢复。定罪uses默认battle:max；保存refresh:{}可明确关闭默认恢复。战斗刷新不清除其他持续记录或重置所有能力开关。每次按钮都是一次推进，点两次就会推进两次。
max uses the effective cap; initial uses the original initialization formula; numbers set an explicit value. Missing events do nothing. Condemnation uses battle:max by default; explicit refresh:{} disables it. Battle refresh does not clear timers or all ability switches. Each click is one separate advancement.

本地与云端共享校验：玩家不能改持续记录、伪造回合计数或执行战斗刷新；服务端验证角色归属与版本，防止旧版本重复提交。无需新增数据库列；云端需重新部署module-state和最新共享文件。
Local and server validation enforce ownership, GM-only editing/battle refresh and versioned atomic commits. Existing JSON storage needs no new columns; redeploy module-state and the shared runtime for cloud use.

## 27. 特定武器能力与适应武器备忘 / Specific Weapon Abilities and Adaptation Memo

武器可声明weapon.type，例如greatsword；它是种类标识，不是装备名字。模块可声明weaponRequirement，其中type匹配武器种类，name为可选中文名称，effectText是供DM裁决的效果文字。weapon范围的melee/ranged/damage输出现在也支持这种能力，只进入种类符合的当前武器结果。
Weapons may declare a stable weapon.type. Abilities declare weaponRequirement.type, optional display name, and effectText. Weapon-scoped attack/damage outputs apply only to matching equipped weapon types, never the character-wide totals.

[可直接复制的武器专攻·巨剑JSON / Weapon Focus JSON](examples/weapon-focus-greatsword.json)

右侧能力模板新增「适应武器模板」。它使用mode:toggle、weaponAbilityMemo:true、outputs:[]，分配实例必须为GM控制。开启时，在战斗备忘列出角色所有已获得且声明weaponRequirement的能力及effectText；关闭的能力也列出并注明关闭。不会扫描描述文字猜武器类型，也不会自动改写任何数值或适用条件。关闭适应武器后汇总备忘消失。
The Adaptive Weapon template is a DM-only toggle with weaponAbilityMemo:true and no outputs. It lists owned weapon-restricted abilities and their authored effectText in Combat Notes, marking disabled abilities. It never parses prose, changes eligibility or applies adapted bonuses. Turning it off removes the summary.

同一种能力有多个实例时汇总只列一次；它不会产生第二份原生能力效果。武器专攻在巨剑上照常加1；适应武器开启也不会替十字弓自动加1，DM自行裁决和手动添加。巨剑旧模板缺少type时会补上greatsword，不改自行填写的种类。
Repeated instances are listed once per module. Native weapon focus applies once to greatswords; adaptation never grants its bonus to crossbows automatically. Legacy greatsword prototypes receive their missing type identifier without replacing an authored type.

## 28. 额外伤害骰 / Extra Damage Dice

outputs新增target:"damageDice"。die为骰子面数，value是骰子数量的数值公式，不是"1d6"字符串。支持d1、d2、d3、d4、d6、d8、d10、d12，数量须为0–10000的整数。现阶段额外骰使用unnamed，作为独立来源累加，不臆测其他类型的骰子取高规则。
Use target damageDice, die for faces, and a numeric value expression for count. Supported faces are 1, 2, 3, 4, 6, 8, 10 and 12. Counts must be integers from zero to 10000. Only unnamed additive dice are currently supported.

```json
{"target":"damageDice","die":6,"duration":"short","bonusType":"unnamed","value":"1"}
```

mode:toggle沿用开关行为，关掉便不加入；when也可照常使用。首次攻击新对手等现场条件仍由玩家判断，并手动启停。右侧能力栏新增「快速打击模板」。
Toggle mode and when conditions retain their existing behavior. Table-adjudicated triggers remain manual. A Rapid Assault template is available in the Abilities sidebar.

额外骰在武器攻击与伤害区，与体型调整后的基础骰按面数升序合并。例如1d6+2d8与3d6+1d4显示1d4+4d6+2d8。d1也保留为骰子，不合进固定加值。来源可展开查看；只改变基础武器的体型档位，不升级附加骰。
The weapon panel merges base and extra dice by ascending faces and preserves source details. Size changes affect only the base weapon. d1 remains a die rather than a fixed modifier.

可选attackMode:"melee"或"ranged"限制攻击方式；省略则两种方式都适用。scope:"weapon"沿用特定武器范围，只对所属武器或满足weaponRequirement的武器生效。省略scope则对当前各武器分别提供加骰，不表示同时发起多次攻击。专长、法术、装备都可提供，装备仍须选用；友军授予也保留die和attackMode，接收后才加入。
Optional attackMode limits melee/ranged applicability. Weapon scope restricts dice to their source weapon or declared weapon requirement. Unscoped dice apply to each relevant weapon calculation, not simultaneous attacks. Accepted allied grants preserve die metadata.

此功能只显示骰式，不掷骰，不自动判定暴击或暴击时额外骰是否翻倍，也不替DM判断免疫、减伤或伤害类型。当前无这些语义字段，勿把需要不同结算规则的来源当成已经自动处理；来源明细仍保留。
This feature displays notation, never rolls or resolves critical multiplication, immunity, damage reduction or damage types. Source details remain available for manual adjudication.

[快速打击完整JSON / Rapid Assault JSON](examples/rapid-assault.json)。沿用原配置保存和备份，无需新数据库列；云端需重新部署module-state共享运行时。
Existing configuration storage/exports need no migration; cloud usage requires redeploying the shared module-state runtime.

## 29. 重击范围与倍率 / Critical Range and Multiplier

输出目标criticalRangeMultiplier用于乘以重击范围宽度，例如基础宽度2（19–20）×2后宽度4（17–20），不是把骰面数字19乘2。criticalMultiplierBonus用于加到重击伤害倍率，例如×2加1成为×3。支持scope:weapon和weaponRequirement，能力文字会进入适应武器的纯备忘。
criticalRangeMultiplier multiplies threat-range width, not the lower die face. criticalMultiplierBonus adds to the critical damage multiplier. Weapon scope/requirements apply normally; adaptation only lists the text.

默认无名来源；多个范围倍率在数学上相乘，倍率加值仍按原加值类型规则叠加。范围最多覆盖20个骰面。若房规限制多个范围效果叠加，应只启用允许的来源。此处仍只显示范围和倍率，不自动掷骰或计算暴击伤害。
Range factors multiply; multiplier bonuses use existing typed stacking. Range covers at most twenty die faces. Enable only permitted sources if the house rule disallows combining factors. This displays the critical profile without rolling or resolving critical damage.

[重击精通·巨剑 / Improved Critical](examples/improved-critical-greatsword.json) · [专攻重击·巨剑 / Critical Specialization](examples/critical-specialization-greatsword.json)

## 30. 护甲资料与条件防御 / Armor Profiles and Conditional Defense

右侧规则模块→装备→「这件全身甲模板」，保存并分配后，在角色盔甲位置选择。模板为小型中甲，基础护甲8经强固后9，增强2，护甲贡献合计11；最高敏捷贡献1，防具技能减值0。保留mithral、medium_armor、reinforced、acid_washed标签，不推断其他材料效果。
Use the Full Plate template under Equipment, save/assign it, then select the armor slot. The Small medium armor grants 9 armor plus 2 enhancement, caps Dexterity contribution at 1, and currently has zero armor-check penalty. Tags do not imply additional unconfirmed material rules.

[护甲完整JSON / Full armor JSON](examples/mithral-full-plate.json)

armor字段包含category(light/medium/heavy)、size、baseArmor、enhancement、dexCap(null代表不限)、checkPenalty（非正数）、可选旧版技能清单字段（不再参与适用范围计算）、speedPenalties（种族初始速度对应变化值）及contexts（条件防御）。护甲增强合入本件护甲贡献，使用armor类型与已有护甲来源取高，不加到接触防御。敏捷上限与GM原有手动上限取更严格者，负敏捷仍保留。
The profile declares category, size, armor/enhancement, Dexterity cap, check penalties, affected skill names, racial-speed mappings and defense contexts. Armor and its enhancement form one armor bonus, excluded from touch defense. Caps take the stricter limit without suppressing negative Dexterity.

此甲speedPenalties为{"20":-5,"30":-10}，从种族初始速度决定，先减速后应用已有状态的速度倍率；不重复减去，也不猜其他初始速度的减速。其他模块速度加值仍按原页面单列，合并规则未定义。
This armor maps racial base speed 20 to −5, and 30 to −10, before condition speed multipliers. Other base speeds and unresolved module-speed merging are not inferred.

防具检定减值是统一底层规则，每件甲只填checkPenalty：平衡、攀爬、脱逃、躲藏、跳跃、手上功夫、翻滚各应用一次，游泳应用两倍。潜行已按房规合并到躲藏，不另设技能。穿上自动应用，脱下撤销，重复计算不重复累加；不影响其他技能、投入点数或技能点池。
Armor check penalties are universal: balance, climb, escape_artist, hide, jump, sleight_of_hand and tumble receive the armor's checkPenalty; swim receives twice it. Move Silently is merged into Hide. Penalties are temporary, equipped-only and never change ranks/budgets. Other skills are unaffected.

旧存档的checkSkills与doublePenaltySkills字段仍可读取，但不再决定适用范围，不必手工清理。新护甲无需填写技能清单；checkPenalty为0时没有技能减值，负数表示减值。
Legacy per-armor skill lists remain accepted but are ignored for applicability; new items only need checkPenalty. Zero is no penalty; negative values are penalties.

条件contexts中，每条有id、label、value、defenses。避矢ranged为+5，避害critical_confirmation为+2，均只列defense和flatDefense。远程重击确认同时适用时显示合计+7；与俯卧等已录入的远程情境亦合并。接触防御不计此甲条件加值。
Contexts explicitly name their applicable defense types. Arrow defense gives +5 ranged, harm avoidance +2 confirmation, both excluded from touch defense. A combined ranged-confirmation total is shown, including applicable existing ranged contexts.

召回记为非战斗备忘：迅捷动作装备未穿着的甲；实际穿上仍在装备下拉框操作。酸濯记为战斗备忘：本物品对强酸、锈蚀、解离豁免+4，不加到角色豁免。notes新增whileOwned:true可让装备未选用时仍显示该条提醒，不启用其数值效果。此甲两条物品提醒都保留；脱下会撤销护甲、敏捷上限、减速和条件防御。
Recall and Acid Washed are reminders, not automated actions or character-save bonuses. whileOwned:true keeps an item note visible while unequipped, without enabling item stats. Unequipping removes armor, cap, speed and conditional defense effects.

保存和备份仍用原JSON结构，无需新数据库列。云端使用需要重新部署module-state及更新的共享运行时。
Existing JSON persistence needs no new columns; redeploy the shared runtime for cloud use.

## 31. 装备开关、元素伤害与按钮计时 / Item Toggles, Elemental Dice and Action Timers

新增五个装备模板：蛛行鞋（feet）、易容帽（head）、力量手套（hands）、岩丝衬衣（torso）、炽热之袍（inner_robe）。各自保存并分配，位置可在JSON中修改。
Five item templates are available; save/assign them and adjust slots in JSON if needed.

item使用mode:toggle时，必须同时装备且enabled:true才提供数值；装备页新增启用复选框。蛛行鞋和岩丝衬衣的实例权限选「PL仅可启停」便可交给玩家操作；其他物品mode:passive表示穿上生效。旧物品未填mode时仍按选用状态生效。
Toggle items require both an occupied slot and enabled:true. Assign toggle access for player control. Passive/unmarked items remain equipped-driven.

蛛行鞋输出speedMultiplier:0.5；与已有减半状态一起取最低倍率，不连续减半。岩丝衬衣输出伤害减免1，备忘保留「挥砍／钝击」，由玩家决定启停，不自动判断绕过方式。力量手套输出strength、short、enhancement、2，不进入技能点池。易容帽仅提供非战斗易容术提醒。
Spider boots halve speed without compounding existing halves. Rock silk gives toggleable DR1 with a literal slashing/bludgeoning note, without inferring bypass rules. Strength gloves give temporary +2 enhancement Strength, excluded from training points. The disguise hat is a noncombat reminder.

炽热之袍输出fireResistance:5，显示在速算卡抗性及当前状态火焰抗性栏。damageDice可加damageType:"fire"，该1d6在伤害区保留火焰标记；与普通骰不混合，同种元素、同面数才合并。fire/cold/acid/electricity/sonic有中文标签，也接受其他合法英文类型标识。暂不自动计算抗性扣减或伤害结算。
The robe adds fireResistance 5 and typed fire dice. Optional damageType keeps elemental dice separate from ordinary dice, merging only equal types/faces. Resistance is displayed but does not automatically resolve incoming damage.

资源fire_shield初始／最大1，玩家使用按钮扣1并创建5回合战斗备忘。没有配置恢复事件，战斗刷新不会补充，DM手动恢复。反弹1d6+9火焰、寒冷减半、反射成功寒冷无伤都在该备忘里由人结算，不自动掷骰或改其他角色HP。生成的护盾记录不绑定装备，脱下袍子仍按剩余回合显示；DM可调整或删除。
Fire Shield has one initial/maximum use with no reset event. Its button consumes a use and creates a five-round memo. Retaliation/cold protection remain manual. The created effect is not equipment-bound and can be edited/removed by the GM.

通用按钮扩展：
Generic action extension:

```json
"createTimedEffect": {
  "name":"火焰护盾",
  "text":"在这里填写生效期间的提醒",
  "category":"combat",
  "remaining":"5"
}
```

放在actions的一条按钮定义中，和changes一起使用。remaining支持按钮公式，但结果必须为1–10000整数。资源扣减与备忘创建原子保存，一项无效则全部不保存；玩家不能通过手动编辑伪造记录。同一实例同一按钮重复合法施放会刷新该记录，不重复叠出多条。倒计时到0后不再显示生效备忘，DM编辑区仍保留。
Place this beside action changes. Countdowns are expression-based bounded integers. Creation and resource changes commit atomically. A valid repeat cast refreshes the same record rather than stacking duplicates. Expired records remain in the GM editor.

[蛛行鞋](examples/spider_climb_boots.json) · [易容帽](examples/disguise_hat.json) · [力量手套](examples/strength_gloves.json) · [岩丝衬衣](examples/rock_silk_shirt.json) · [炽热之袍](examples/searing_robe.json)

无需数据库迁移；云端需更新module-state及共享运行时。
No new database columns; redeploy the shared runtime for cloud use.

## 32. 武器标签限定与豁免情境 / Weapon Tag Requirements and Save Contexts

weaponRequirement可用tags数组限定武器（要求全部标签符合），type与tags同时存在时两者都要符合。仅带tags的要求不算“特定武器类型”，不会被适应武器汇总；其scope:weapon输出只进入符合标签的那把武器，不影响另一把武器。投掷标签统一使用thrown，显示为投掷。
Weapon requirements may filter by tags, with all requested tags required. Type and tag requirements combine with AND. Tag-only filters are not listed as specific-weapon types by the adaptation memo. The thrown tag marks throwing weapons.

context现在支持fortitude/reflex/will。带context的豁免来源不进入通常豁免总值，而是在对应豁免旁显示该情境合计，按原有加值类型取高规则合并；是否面对该情境由玩家现场判断，不自动勾状态。
Save outputs may use context to display a conditional total without affecting the ordinary save. Typed stacking is recalculated for the context. Applicability remains table-adjudicated.

[强心半身人完整JSON / Strongheart Halfling](examples/strongheart-halfling.json)：力量−2、敏捷+2，三个AC与两种命中+1体型，躲藏+4体型及+2种族，攀爬/跳跃/聆听+2种族；意志面对恐惧+2士气；thrown武器命中额外+1种族。潜行已并入躲藏，不另建技能。该模块由DM分配，选择种族名称不会自动再添加一次。
Assign the racial module explicitly; selecting a race name does not duplicate the effects. Move Silently is merged into Hide, so its racial +2 applies to Hide alongside the +4 size bonus.

## 33. 备忘文字中的公式 / Expressions Inside Note Text

模块notes.text使用{{表达式}}显示计算结果，例如「受到{{level}}d6伤害」在9级时显示「受到9d6伤害」。沿用安全公式解释器和原变量校验，可读本模块资源、参数、职业等级和允许的跨模块变量。未知变量或不完整的双大括号会被拒绝，不执行JavaScript。该语法只用于模块备忘，不自动解释DM手填的持续备忘。
Module note text interpolates safe expressions inside double braces. The same validation and interpreter apply; unknown variables/malformed placeholders are rejected. Manually authored timed notes are not implicitly evaluated.

notes.when仍决定整条是否显示；例如resources.radiance>0表示资源未耗尽时显示。按钮扣至0后该条消失，原资源和按钮保留。示例未声明自动恢复，不推断恢复周期。
The existing when condition controls note visibility. At zero charges the note disappears, while the resource/action remains. Reset timing is not inferred.

[伊敦·安姆的钦定者完整JSON / Complete Chosen JSON](examples/idun-anm-chosen.json)

此类范围伤害仅生成计算后的说明，不自动掷骰、判断范围或目标种类、扣除其他角色生命。资源按钮沿用原子保存与权限检查。云端请重新部署更新后的共享运行时。
Area effects remain descriptive: no rolling, targeting or automatic damage to other characters. Resource consumption uses the existing atomic action path.

## 34. 每日法术装载与职业法术位 / Daily Spell Preparation and Class Slots

掌握法术列表现为每日装载界面：上方选择施法职业，显示各环总位数、已装载、剩余数；下方左侧为本角色已分配的法术，右侧为槽位。这里只保存每日装载，不施放、不扣次数、不自动给其他人效果。
The spell page now provides daily preparation. A per-class quota table sits above the assigned spell book and slots. Preparation does not cast spells, spend charges or grant effects to others.

DM计算配置→职业法术位表：选择职业，添加所需职业等级行，填写0–9环位数，再保存整份配置。每个职业独立按自身等级查表，兼职分别统计，不按角色总等级或历史最高表行猜数值。未配置当前等级时会提示；不推断属性额外法术位、专精位或其他房规。JSON可配置至20环，已有高环列会自动显示。
DMs add exact class-level rows under the spell-slot editor. Multiclass pools stay independent; there is no inferred carry-forward, ability bonus or specialty slot. JSON supports levels through ring 20, with higher columns shown when present.

```json
"spellSlots": {
  "1": {"0":3,"1":1},
  "2": {"0":4,"1":2}
}
```

以上仅是结构示例，不会自动写入任何职业。字段保存于mechanics.config.classes.<职业id>.spellSlots。没有表的职业不提供装载池，空行表示该等级0位；未填行表示尚未配置。
These are illustrative counts only, never seeded rules. Missing tables mean no preparation pool; an empty configured row means zero slots, while a missing row means unconfigured.

法术模块增加spell资料，保存并分配给角色后才出现在其法术书中。侧栏「法术→空白法术」已带默认1环字段，可自行改。
Spell modules declare their level and must be assigned to the character. The blank spell template includes a level field to edit.

```json
{
  "id":"example_spell",
  "name":"待填写法术",
  "category":"spell",
  "spell":{"level":1,"classes":["cleric"],"classLevels":{"cleric":1}},
  "parameters":{},
  "outputs":[]
}
```

classLevels存在时，以该映射为唯一职业环级来源，未列出的职业不适用；此时可以省略level，classes不参与判定。完全没有classLevels时才读取level缺省环级，并使用可选classes限制职业；classes省略表示通用，空数组表示无适用职业。引用职业必须存在。最高20环，最低0环。
level is the default ring. Optional classes restrict eligible casting classes; omission allows any configured pool. Optional classLevels overrides the ring for specific classes.

同一法术实例可以装多次，每次占一个槽。低环可上装高环，高环不能下装低环；必须使用自己的已分配法术，不能借另一角色或其他职业未授权法术。点击「＋装载」会在选中职业池找最低可用环位；拖拽或先选法术再点槽位可指定高环。拖拽是复制装载，不会从法术书移走。手机可点选，不要求触屏拖动。
Each preparation occupies one slot; repeated copies are allowed. Lower spells may fill higher slots, never vice versa. Quick Add chooses the lowest available eligible slot. Dragging copies from the book; tap-select and slot buttons provide the touch alternative.

每个装载位可单独写超魔／调整备注，不自动实施超魔规则或修改效果参数。装载完成点击「保存装载」，保存于rule_state.spellPreparations，每条记录为：
Per-slot notes support manual metamagic adjudication without inferring rules. Save Preparations persists these records:

```json
{"classId":"cleric","slotLevel":2,"slotIndex":0,"spellInstanceId":"角色已有法术实例ID","note":"手工超魔备注"}
```

不复制模块定义，不消耗或开启原法术实例。更改法术位、职业等级、法术环级或分配后，旧装载不会被静默删除；无效记录进入待处理区，卸下再保存。不改装载时，旧记录不会阻碍其他角色操作保存。
Preparation does not clone or activate modules. Rule/class/assignment changes preserve stale entries for manual cleanup. Unchanged stale records do not block unrelated saves.

现有账号归属校验继续生效，玩家可操作自己角色的每日装载，不能改职业表或法术定义。云端module-state同样验证槽位容量、职业、环级与法术归属；无需新数据库列，部署需更新共享运行时。
Ownership permissions remain in force. The shared runtime validates capacity, ring, class and assigned spell instance. Existing JSON storage needs no new columns; redeploy the updated shared runtime for cloud use.

### 职业一键恢复 / Class recovery

职业配置 `spellRecovery: true` 允许玩家一键恢复该职业的已消耗装载；`false` 禁止。缺省时十字军（crusader）允许，其余职业禁止，DM可覆盖。装载记录 `spent: true` 表示已消耗。恢复保留法术、槽位和备注，仅清除当前职业的消耗标记，不恢复其他资源、不取消持续效果。DM可恢复任意职业。每次操作需保存装载。

Set class `spellRecovery` to permit player recovery. Defaults: crusader allowed, other classes denied. DM can override. `spent` tracks each prepared copy. Recovery clears only that class's spent flags; preparations, notes, unrelated resources and ongoing effects remain. Save preparations to persist changes.

0环特殊规则 / Cantrips: 0环装载数不限，使用不消耗，无需配置0环位数。既有0环装载与备注保留，旧消耗标记不影响使用。0环放入高环位时仍按该高环位消耗。Zero-level slots have unlimited capacity and uses; existing entries are retained. A zero-level spell prepared in a higher-level slot still consumes that higher-level preparation.

### 主动进入状态 / Voluntary states
状态JSON可设置 `"tags": ["active_entry"]`，将其显示在“状态”折叠栏外的“主动进入”区。仅改变显示位置，不改变数值、权限或状态联动。设 `"tags": []` 可将内置主动状态移回折叠栏。The active_entry tag affects display placement only; an explicit empty array overrides the built-in placement.

### 架势与施法栏 / Stances and casting bar
架势使用 `"category":"spell", "equipmentSlot":"stance", "mode":"passive"`，无需spell环级资料。DM在法术栏创建并分配，角色可在速算卡武器区下方切换架势，同一时间仅一项生效。装备栏也可切换同一槽。架势不参与每日装载。Stances are assigned spell modules occupying the exclusive stance slot; selection, rather than enabled, controls effects.
玩家法术资源按已保存的每份装载生成独立按钮，点击后自动保存消耗状态。DM可单独恢复；允许恢复的职业可整组恢复。0环无限。按钮暂不生成施法效果。Each prepared copy has its own one-use button, DM recovery and optional class recovery. Cantrips are unlimited; casting effects are not generated yet.

### 冲锋队友的条件 / Recipient conditions
`grant.recipientWhen: "conditions.charge"` 在接收者身上判断冲锋，`grant.outputs[].value: "level"` 仍读取来源角色总等级。只有接受了友军效果、处于冲锋的队友才获得领导冲锋伤害。架势切走即停止授予；来源自己不获得。`recipientWhen`只允许状态引用，不支持其他接收者数值。The grant condition reads the recipient's conditions; output formulas still read the source. Ally acceptance is required.
四个十字军架势模板位于法术模板栏；也可从public/examples下对应JSON导入。武器伤害体型调整仅在“当前状态”的GM折叠区修改。

### 装载施法与限时数值 / Prepared casting and timed effects
`spell.castAction` 指向本模块的操作ID。速算卡点击该份装载时，原子地消耗装载并执行操作；失败不消耗，已消耗的份数不能再次施放。0环执行效果但不消耗。没有此字段的旧法术仍只记录消耗。`actions[].createTimedEffect.expiresModule: true` 在倒计时归零时关闭本模块，需搭配toggle及开启操作。再次施放同一实例刷新同一计时，不重复叠加。DM或允许恢复的职业恢复次数不会关闭仍在持续的效果。
Timers advance with the caster's round refresh, including ally grants. Recipients explicitly accept grants. Recasting the same module instance refreshes its timer; distinct instances remain independent.
十字军8个武术JSON位于examples/crusader-maneuvers，均按1环配置；领导攻击／无畏打击持续1个来源角色回合，只有攻击已被来源命中的目标时才应接受。`objects_only`额外骰单独标为仅对物品，不判断目标。碎骨者DC使用动态备注，其余条件（豁免、硬度、借机）由现场裁决。

限时数值以持续记录为准 / Timer-owned activation: 对非装备toggle模块，若操作定义了 `createTimedEffect.expiresModule: true`，其效果只有在存在指向本实例、剩余回合大于0且有效的持续记录时生效。记录归零或删除立即撤销数值、额外骰、普通备忘和友军授予，不依赖enabled是否残留。手动延长回合可恢复效果。没有此配置的常驻能力、架势、装备不改变。Existing expiresModule JSONs need no edits. Timer ownership applies to all outputs and ally grants from the instance.

### 攻击次数 / Attack count
基础为 `FLOOR((bab + 4) / 5)`，bab只含各职业基础命中贡献。新输出 `target: "attackCount"` 提供次数加值，支持现有加值类型、长短效和武器scope。猫鼬之舞使用short unnamed +1，持续记录归零或删除即撤销。速算卡显示全局次数；每把武器行显示包含该武器专属加值的次数。不推断每次攻击的递减命中或额外动作规则。Base attack count uses unmodified class BAB. Global and weapon-specific modifiers use normal typed stacking; per-attack penalties are not inferred.

先攻＝最终敏捷调整＋长效＋短效；伤害减免、法术抗性基础均为0。武器力量伤害：副手优先×0.5，否则two_handed且无light标签×1.5，其他×1；力量贡献向下取整后加现有固定伤害加值。`light`为轻型武器标签。每把武器分别显示总伤害，通用伤害附加不重复包含力量。Initiative uses final Dexterity modifier; DR and SR start at zero. Offhand Strength damage uses 0.5, non-light two-handed uses 1.5, otherwise 1; floor Strength contribution, then add existing modifiers.

### 准备／自发、高环和超魔 / Casting modes and slot increases
职业 `spellcastingMode` 为 `prepared` 或 `spontaneous`。缺省机关术师artificer为自发，其余准备；DM可显式覆盖。自发角色隐藏装载栏，速算卡列出已分配且职业适用的所有已知法术。`spellSlotUses[classId][ring]`记录各职业消耗次数，由施法原子操作更新，DM可手动恢复；PL仅在职业授权时可恢复。
全局配置 `metamagic: [{"id":"extend","name":"自定义超魔","slotIncrease":1}]` 可由DM法术位编辑器管理。高环＋N和点亮的超魔升环数相加，只改变消耗环级，不改变原标签排列、伤害或持续时间。自发基于法术原环；准备基于已装入环级。0环在没有升环时无限，有升环则消耗对应环。
准备型的高环施放使用该职业对应高环的空余次数（未消耗位），不消耗低环装载；高环位已装别的法术也共享这一剩余数，耗尽后不能施放。低环份数用完仍可选高环施放。同一已知／装载实例重复施放刷新其持续记录，不重复叠加。转换施法方式保留旧装载和已记录的额外法术位消耗，不删除数据。
Mode, slot availability and metamagic costs are checked again at cast commit. Spontaneous pools are separate for multiclass characters; ordinary prepared casts retain per-copy consumption, while upcasts consume the destination ring's shared remaining capacity. Metamagic defines slot cost only; mechanical effects require separate rules.

### 批量导入 / Batch import
规则模块编辑栏提供“批量导入JSON”：粘贴或选择.json文件（最多5MB），支持模块数组、单个模块以及 `{"modules":[...]}`。每批1–1000项，规则库总上限为5000项。先校验预览新增／更新，再统一保存；同批重复ID拒绝，更新已有ID需勾选允许更新。跨模块引用可指向同批任意顺序的定义；整批失败不写入。配置版本变动后需重新预览，原JSON保留。导入仅更新规则定义，不自动分配角色。
Ask an AI to return a strict JSON array of independent rule modules using the documented schema, unique IDs and valid target/bonus identifiers. No Markdown fences or comments. Import validates the merged catalog atomically; existing IDs require explicit update opt-in. Character assignments and instances are not imported.

### 描述与备注内公式 / Formula text
模块description与notes[].text都支持 `{MAX(mod.strength, mod.dexterity)}`，兼容旧的 `{{...}}`。函数名大小写不敏感，字段名使用现有的 `level`、`mod.*`、`classes.*.level`、`skills.*.ranks/total`、`params.*`、`vars.*`、`resources.*` 等，不自动声明a/b等变量。例如 `"description":"伤害：{MAX(1, FLOOR(level / 2))}d6\n豁免DC：{10 + mod.intelligence}"`。模块描述随角色变化重新计算，计算失败显示错误而不是崩溃。持续操作的createTimedEffect.text在生成时取当时值；手动持续备注中的角色公式则随状态更新。花括号保留给公式，文本不作为JS运行。
Descriptions and module notes share safe expression interpolation, accepting both brace styles; newline escapes render as line breaks. Text formulas never directly modify stats. Action-created timer text captures the value on use; module descriptions/notes remain live.

### 指定目标的限时法术 / Targeted timed spells
`grant.mode: "single"` 或 `"multiple"` 的法术在详情下显示目标操作台。点标签只打开操作台，选择后点“施放并创建持续效果”才扣次。现有grant结构不变；指定目标法术需配置 `spell.castAction` 及该操作的 `createTimedEffect.expiresModule: true`。来源已知、环位、目标阵营／存在性均在提交时校验。
每次施放为每个目标创建独立持续记录，记录目标和当次计算出的授予数值。对甲和乙施放互不替换；每份由接收者单独接受。手动改剩余回合／删除记录只影响该份；回合按施法者推进。重复对同一人施放也创建独立记录，是否接受叠加由DM／玩家裁决，仍使用原有加值类型规则。
The numeric grant is snapshotted on cast, while recipientWhen remains a live recipient-condition check. Copies are independently accepted, expired and removed. Existing all-target auras/stances retain their live behavior. Target selection itself does not spend a slot.

### 删除规则定义 / Delete a rule module
DM在规则模块中选中已有定义，展开“删除当前规则定义”，查看使用角色和跨模块引用。仍被角色使用或被其他模块引用时禁止删除；先移除角色分配或修改引用，勾选确认后删除。删除只更新规则库，不自动改写角色或其他模块。Delete checks every loaded character and catalog reference, then saves with the existing configuration version check.

### 施放时选择技能 / Skill choice on cast
指定目标法术的grant可增加 `"skillChoice":{"value":"FLOOR(classes.artificer.level / 2) + 2","duration":"short","bonusType":"circumstance"}`。这时 `grant.outputs` 可为空数组。详情操作台要求对象及技能都选好；施放请求传 `skillId`（如hide/search），提交时再次验证，快照转换成具体 `skill.hide` 等输出。选择仅属于当次施放，不改写模块定义。持续记录名称附技能名，接收者自行接受。技能强化示例见examples/skill-enhancement.json。
Targeted spells can define grant.skillChoice instead of a fixed skill output. The chosen skill is validated, converted to a concrete target and snapshotted per cast. A missing/unknown skill prevents casting without spending a slot.

### 授予备注 / Granted notes
`grant.notes`支持与普通notes相同的text/category/when和公式。纯备注法术可以设置 `grant.outputs: []`。指定目标施放时文本计算后存入该份持续记录；接收者接受后显示在对应备忘栏。归零／删除记录后备注撤销。物品储法示例为每机关术师等级600轮，使用物品后由DM手动结束记录，不自动模拟储存法术、检定、经验或释放。
Granted notes are snapshotted on targeted cast and shown only after explicit acceptance. Live all-target grants also support notes.

职业映射优先 / Authoritative class mappings: `spell: {"classLevels":{"artificer":1,"cleric":0,"shrine-maiden":0}}` 是有效完整资料，不需要level或classes。没有classLevels时可写 `spell:{"level":1,"classes":["artificer"]}`。classLevels中的0不会退回level。此读取规则统一用于分配、列表分组、装载校验和施放；准备位本身保留已选用的高环位。

施放操作上下文 `cast.level` / Casting class level: 仅在spell.castAction对应操作的公式（含createTimedEffect.remaining/text）中可用，读取本次选择的施法职业自身等级，兼职不相加。每等级1分钟可写 `10 * cast.level`。该字段不在普通description/notes中使用，因为浏览法术时尚未执行施放。六种属性增强法术示例见examples/ability-enhancement-spells/all.json。

### 同次施放的阶段备注 / Per-cast phased notes
`createTimedEffect.dynamicText` 可用 `{IF(timer.remaining >= 3, '2d4', IF(timer.remaining = 2, '1d4', '0'))}`，仅允许读取该记录自己的timer.remaining。`opening: {"remaining":"2", "dynamicText":"开始阶段：{IF(timer.remaining >= 2, '0', '1d4')}"}` 会额外创建开始阶段计时。两份同时递减，开始阶段存在时仅遮住同一phaseGroup主阶段备注，不暂停其计时，不撤销数值效果。每次施放及每个接收目标具有独立phaseGroup；不同法术、不同施放和不同目标互不遮挡。
开始／主阶段共用接收效果键，过渡时保留已接受状态。开始记录归零或删除后立即显示尚在持续的主阶段，主阶段归零则结束。DM可在持续备忘面板分别调整回合，编辑动态说明时保留timer.remaining公式。原有普通定时备注不受影响。
冻寒／灼热JSON在examples/metal-spells/all.json，总轮数由params.duration控制（默认7，包含前2轮），没有自动扣血或掷骰。该参数可由DM手动调整；后续专长可在remaining公式中引用其变量，不自动将任意超魔按钮解释为延时。
Both clocks tick from the cast. Opening suppresses only the main note within the same cast-target group; other notes and numeric effects are unaffected. Ordinary seven-round output is 0, 1d4, 2d4, 2d4, 2d4, 1d4, 0. Extending total duration preserves the opening/tail and extends the middle.

## 统一施法者等级 / Effective caster level
`caster.level`表示本次所选职业的有效施法者等级＝本职业真实等级＋适用长效／短效调整，非负、向下取整。它可用于法术description、授予outputs/notes、变量及施放操作（持续回合等）。法术页面按当前职业显示，施放时快照数值，不追溯重算已存在的持续效果。`classes.artificer.level`仍是实际职业等级，`cast.level`保留为未调整的本次施法职业等级；不要把职业能力的真实等级引用替换为caster.level。
能力提高等级示例：`{"target":"casterLevel","casterClass":"artificer","duration":"long","bonusType":"unnamed","value":"2"}`。省略casterClass表示所有职业适用，同类型按现有取高规则。施法者等级调整不可引用caster.level自身，防止循环。真实职业等级、法术位、已知环级和技能点不随之改变。
速算卡按职业显示施法者等级；当前状态中的施法者等级面板可展开来源，DM可新增长效／短效来源，随后保存当前状态。
规则模块 → 迁移旧法术施法者等级公式，可检查浏览器中旧法术，下载原JSON备份后统一迁移classes.artificer.level/cast.level。只处理spell模块（不含架势），不改职业能力、物品或已存在的持续记录；有意使用真实职业等级的法术可在迁移后手动保留该引用。项目JSON备份在backups/caster-level-2026-10-25。
Effective caster level is selected per casting class, with typed global/class-specific modifiers. Spell descriptions and casts use that class's adjusted value; existing targeted effects retain snapshots. Formula migration is explicit and backed up, never a reinterpretation of raw class-level references.

### 从属目标与默认接受 / Companion targets and default acceptance

在法术的 `grant` 中使用以下字段；现有 `outputs`、`notes` 和持续效果操作保持原有写法。
Use these fields in a spell's `grant`; keep its existing outputs, notes and timed cast action.

```json
{
  "name": "从属法术效果",
  "group": "ally",
  "mode": "companions",
  "defaultAccepted": true,
  "outputs": []
}
```

以上仅为字段示意：完整模块的 grant 仍需至少一项 output、note 或 skillChoice。
This is a field example: the complete grant still needs an output, note or skillChoice.

- `mode: "companions"`：自动发送给施法角色的所有直接从属，无需选择目标。不是同账号所有角色，也不是全体友军。没有从属则不消耗法术位。
  Automatically targets all direct companions of the casting character, not every character controlled by that account. No companions means no slot is spent.
- `defaultAccepted: true`：收到的新效果默认接受；取消勾选后停用数值与备忘，再勾选恢复。未填写时仍默认不接受。该选项也可单独用于其他目标模式。
  New effects are accepted by default; an explicit unchecked box disables their outputs and notes. Rechecking restores them. Omit this field to retain opt-in acceptance. It also works independently with other target modes.
- 仍需 `spell.castAction` 指向带有 `createTimedEffect.expiresModule: true` 的施法操作。每个从属独立计时，一次施法消耗一次法术位。`skillChoice` 若存在，仍需施法者选择技能。
  A timed cast action with `expiresModule: true` is required. Each companion has its own record; the cast spends one slot total. A skillChoice still requires choosing a skill.

### 九种能量抗性 / Nine energy resistances

输出 target 对照（数值结算与其他加值相同；最终值为0时不显示）：
Output targets (normal bonus stacking; entries whose final value is zero are hidden):

| 能量 / Energy | target |
|---|---|
| 酸 / Acid | `acidResistance` |
| 寒冷 / Cold | `coldResistance` |
| 电击 / Electricity | `electricityResistance` |
| 音波 / Sonic | `sonicResistance` |
| 力场 / Force | `forceResistance` |
| 火 / Fire | `fireResistance` |
| 水 / Water | `waterResistance` |
| 光明 / Light | `lightResistance` |
| 黑暗 / Darkness | `darknessResistance` |

例如 / Example: `{"target":"coldResistance","duration":"short","bonusType":"unnamed","value":"10"}`。
原有 `fireResistance` 保持兼容，无需修改旧装备。Existing fireResistance definitions remain compatible.

### 本次施法参数 / Per-cast parameters

在 `parameters` 中声明参数，再通过 `spell.castParameters` 列出需要在施法确认区填写的键名，例如：
Declare the parameter normally, then list its key under spell.castParameters:

```json
"spell": {
  "classLevels": {"artificer": 3},
  "castAction": "cast",
  "castParameters": ["energy"]
}
```

这些参数显示在法术描述下方的施法确认区，而不是模块参数面板。选择后点击“施放并创建持续效果”。玩家可选的参数需声明 `playerEditable: true`。选择、数字、布尔类型均可用；未填写或非法选择不会消耗法术位。公式继续用 `params.energy` 等引用。
These fields appear in the cast confirmation panel, not the module parameter editor. Player-selectable fields require playerEditable: true. Choice, number and boolean fields are supported. Missing or invalid input does not spend a slot. Formula references remain params.energy, etc.

本次参数不写回角色模块的长期配置；操作生成的文字、授予数值与备忘在施放时保存为快照。后续改选不会修改之前已发送的效果。带绑定持续操作的 `grant.mode: "all"` 法术会自动为所有符合条件的目标建立独立持续记录。
Per-cast selections do not overwrite persistent instance parameters. Action text, granted values and notes are captured at cast time; later selections do not alter earlier grants. Timed all-target spells create separate records for all eligible recipients.

### 持续授予资源 / Resources attached to received timed effects

在带绑定持续操作的法术 `grant.resources` 中声明资源。上限与初始值按施法者当时的上下文计算，保存为快照。示例：
Declare resources under a timed spell's grant.resources. Bounds and initial values are captured using the caster's context:

```json
"resources": {
  "absorbed_damage": {
    "label": "已吸收伤害",
    "initial": 0,
    "min": "0",
    "max": "MIN(10 * caster.level, 150)",
    "integer": true,
    "playerEditable": true,
    "endEffectWhenFull": "已满"
  }
}
```

- 每次施法、每位接收者独立计数，显示在接收者速算卡的“玩家资源”。输入后点击“保存资源”。
  Each cast and recipient has an independent counter under Player Resources. Save Resources persists edits.
- `endEffectWhenFull` 是可选的满值结束按钮名称。只有达到上限才能点击；点击会立即保存本接收者的结束状态，使对应收到的效果、备注和资源池停用并隐藏，不会恢复。源角色的计时记录保留用于追踪，直到到期；其他接收者不受影响。
  Optional endEffectWhenFull names a completion button enabled at the maximum. Clicking saves the recipient's ended state and hides/disables that received effect, notes and counters permanently. The source timer remains as tracking history until expiration; other recipients are unaffected.
- 持续记录到期／删除，接收者的效果和资源池也随之消失。取消接受会暂停显示与生效，但保留已记录的资源值。
  Expiration/deletion removes the received effect and pool. Unchecking acceptance disables/hides them but preserves recorded values.
- 不自动吸收伤害，不自动扣血。资源上限、权限及满值结束条件均在服务器端复核。
  Damage absorption and HP are manual. The server rechecks bounds, permissions and completion conditions.

### 运动状态与人工生命强化 / Movement states and artificial-life enhancements

主动状态：`conditions.climb` 攀爬（原速×1/4）、`conditions.swim` 游泳（原速×1/2）、`conditions.fly` 飞行（原速×0）。状态倍率先作用于原速（含护甲调整），再加模块 `speed` 的长效／短效加值；不在此步取整。例如原速30，攀爬时7.5，攀爬强化+20后27.5。未开启对应状态时，条件速度加值不生效。
Active movement states scale the original speed (after armor adjustments) before adding module speed bonuses, preserving fractional values. Base30 becomes climb7.5/swim15/fly0; the corresponding +20 enhancement produces27.5/35/20. Conditional bonuses only apply while their state is active.

人工生命强化分为独立专长，批量导入文件：`examples/artificial-life-enhancements/all.json`。等级统一读本角色的 `level`。天生防御作用于普通与措手不及防御，接触防御不增加。DM手动分配数量；技能强化允许重复分配，每份由DM选择一项技能，+3无名可累加。偷袭额外骰标为“仅偷袭”，是否符合条件由现场判断。
Enhancements are separate feats using the construct's own level. Natural armor applies to normal and flat-footed AC, excluding touch AC. Assignment counts are manual. Each repeatable skill feat has a DM-only skill choice and a stacking +3 unnamed bonus. Sneak dice are labeled conditional; eligibility is adjudicated at the table.

### 独立施法来源与附属操作 / Independent casting sources and linked operations

被动专长可声明 `grantsCasting: {"id":"innate-magic","name":"天生魔力"}`。拥有该专长的角色获得独立施法表，基础施法者等级及法术位表的等级行读取角色总等级；不会增加职业等级或职业基础属性。`casterLevel` 加值照常适用。DM在“职业／独立来源法术位表”配置其自发／准备方式及各等级法术位。
A passive feat can grant an independent casting source. Its base caster level and slot-table row use total character level; it adds no class levels or class statistics. Normal casterLevel modifiers apply. Configure it in the DM class/independent-source slot editor.

法术通过 `spell.classLevels` 加入该表，例如 `{"innate-magic":1}`。已知法术仍由DM分配，拥有施法来源不自动掌握整个规则库。配置保存在 `castingSources["innate-magic"]`，施法消耗与其他职业分开。移除授予专长后，无法再用该表施放；已有持续快照保持原样。
Assign known spells with a classLevels entry such as innate-magic:1. Ownership does not grant every library spell. Slots and consumption are separate. Removing the granting feat prevents further casting; existing snapshots remain unchanged.

- `grantsModules`：分配模块时自动附带指定模块；附属模块已存在时不重复添加。`defaultAccess` 可设为gm／toggle／parameters，决定新实例的默认权限。
  Automatically assigns linked modules without duplicating existing linked instances. defaultAccess selects initial GM/toggle/parameter access.
- `requiresOwnedModule`：缺少指定的父模块时，附属操作不显示也不生效。
  Hides/disables a linked operation while its required parent is absent.
- `activeConditions`：此模块生效时带入指定状态，例如临时疯狂带入confused；关闭模块只撤回其带入的状态，不影响手动勾选的同名状态。
  Grants listed conditions while active, preserving separately checked conditions when disabled.
- `timedOnly: true`：开关模块只在其有效绑定持续记录存在时生效。操作的 `createTimedEffect.activateModule` 可指定其自动附带的一个timedOnly模块，触发后绑定到这一次计时；不与expiresModule并用。
  A timed-only toggle requires a live linked record. An action may activate its linked timed-only module and bind it to its timer using activateModule, separately from expiresModule.
- `spellDamageReduction`：仅对法术的伤害减免，单独显示，避免被计入普通伤害减免；具体减伤仍由现场结算。
  Spell-only damage reduction is displayed separately; damage settlement remains manual.

天生的魔力示例：`examples/innate-magic/all.json`。请批量导入全部定义，再只分配“天生的魔力”，会自动附带临时疯狂与爆发操作。资源恢复规则未指定，暂由DM手动恢复。
Import all example definitions, then assign only the main feat; madness and burst modules are added automatically. Resource recovery is manual until a recovery rule is specified.

### 自动法术延时 / Automatic Extend Spell

导入并分配 `extend_spell` 专长后，施法区自动出现“法术延时＋1环”。该专长声明 `metamagic: {"slotIncrease":1,"durationMultiplier":2}`，勾选后以高1环消耗，并在施放时将持续记录的轮数乘2。自己的记录及发送给单个／多个／所有友军、从属的独立记录均适用。旧记录不随之后的按钮状态改变，资源上限、加值和施法者等级不翻倍。
Assigning the feat adds its +1-ring toggle automatically. Selected casts double timer duration at creation, including recipient snapshots. Existing records remain unchanged; resource caps, bonuses and caster level are not doubled.

- `spell.durationType`：可选 timed（默认）、instant、permanent、concentration；后三种不延长。
  Optional durationType: timed (default), instant, permanent, concentration. Only timed durations extend.
- `createTimedEffect.extendable: false`：这条记录不接受持续倍率。
  Excludes this timer from duration multipliers.
- `createTimedEffect.opening.extendable: false`：开始阶段不延长。冻寒／灼热金属已使用此设置：总时间7→14轮，开始阶段保持2轮，延长中间的2d4阶段。
  Excludes the opening phase. Metal spells retain a two-round opening while total duration becomes fourteen rounds.

实际轮数以施放后创建的计时记录为准，普通法术说明仍展示未超魔的基础持续时间。持续记录上限为1,000,000轮，允许长时间法术正常延时。
Created timers show the actual duration; normal descriptions retain base duration. The timer limit is 1,000,000 rounds to support extended long-duration spells.

### 复用职业法术表的独立来源 / Independent sources reusing a class spell list

`grantsCasting` 可声明 `spellClass` 与默认 `spellcastingMode`：

```json
"grantsCasting": {
  "id": "stored-infusion",
  "name": "储存机关术",
  "spellClass": "artificer",
  "spellcastingMode": "prepared"
}
```

该独立来源可掌握机关术师法术，按机关术师映射读取环级，原有法术无需增加stored-infusion归属。法术若显式填写本来源的classLevels，则优先使用显式环级。法术位和消耗与原职业分开，DM在职业／独立来源法术位表配置；需先分配已知法术，再装载后使用。基础施法者等级仍读持有者自身总等级，不读取主人。
The source reuses artificer eligibility and spell rings without editing every spell. An explicit classLevels mapping for the source takes priority. Slots and spending are independent and configured by the DM; assign known spells, then prepare them. Base caster level uses the holder's total level, not the master's.

### 骑乘专长、伤害倍率与到期疲乏 / Mounted feats, damage multipliers and expiry conditions

批量示例 `examples/cavalier-feats/all.json` 包含16项专长及一个自动授予的狂暴计时模块。狂暴次数恢复暂由DM处理；技能与行为限制按备忘人工判断。
The batch contains sixteen feats plus an automatically granted rage effect. Rage recovery and behavioral restrictions remain manual.

- 骑枪相关能力匹配 `weapon.type: "lance"`；近战武器需有 `melee` tag。奋力冲刺的三倍版本另外匹配中文 `长枪` tag。同时启用能力、冲锋charge、骑冲mounted_charge才计入倍率。
  Lance feats match weapon.type=lance. Spirited Charge requires melee, active charge/mounted_charge and its toggle; the triple version additionally requires the 长枪 tag.
- `damageMultiplier` 按最高倍率处理，不将×2与×3相乘；武器区合并所有伤害骰、固定加值和力量贡献后显示倍数结果。`requiredWeaponTags` 可对武器范围的一条输出进一步筛选，`attackMode` 可将倍率限定为melee或ranged。
  Damage multipliers use the highest factor and affect all dice and flat damage. Required tags filter an individual scoped output; attackMode can restrict the multiplier to melee/ranged.
- `createTimedEffect.onExpireConditions` 可指定到期状态。计时归零或删除会写入这些状态；例：狂暴结束进入fatigued。状态定义的 `prevents` 列出不可进入的状态；疲乏阻止charge与mounted_charge，仍可手动关闭疲乏。
  Expiry conditions are applied when a timer expires or is deleted. Conditions may prevent entry to listed conditions; fatigue blocks charge/mounted_charge and is manually removable.
- 非装备也可用 `notes[].whileOwned: true`，使开关关闭时仍显示备忘，数值效果仍由开关控制。
  Non-item toggle modules may retain notes while inactive without retaining their numeric effects.

### 上马与坐骑速度 / Mounted state and companion speed

`conditions.mounted` 表示上马；`conditions.mounted_charge`（骑冲）需要先上马才能勾选。下马自动清除骑冲，但不会删除坐骑或清除普通冲锋。
Mounted charge requires the mounted state. Dismounting clears mounted charge but preserves the companion and ordinary charge state.

在速算卡“主动进入”上方选择自己的直接部属作为坐骑，选择保存于 `rule_state.mountId`。只有一个部属时自动选用；多个时须明确选择。上马后人物显示坐骑当前计算出的速度，包括坐骑护甲、状态、已接受效果和速度加值；下马恢复人物自身速度。选择与状态随“保存操作”保存。坐骑数据未配置时显示待配置，不猜测速度。
Select a direct companion above the active-state controls. A sole companion is selected automatically. Mounted movement follows the companion's computed speed, including armor, conditions, accepted effects and bonuses; dismounting restores personal movement. Save Operations persists the selection and state. Missing movement data remains explicitly unconfigured.

状态定义可用 `requires: ["mounted"]` 表示先决状态；界面和保存校验均会限制不满足条件的状态。
Condition definitions may declare required prerequisite states; UI and save validation enforce them.

### 主要与次要架势／光环 / Primary and secondary stances/auras

两栏独立生效、分类固定，不可互换：

- 主要：`"equipmentSlot": "stance"`。
- 次要：`"equipmentSlot": "secondary_stance"`。

Both slots are independent and enforce their own category. A secondary aura cannot occupy the primary slot, and vice versa. Existing stance definitions retain their primary classification unchanged.

沿用原有架势格式：`category: "spell"`，通常 `mode: "passive"`。只需拥有并在对应栏位选择，不装载、不消耗法术位。切换其中一栏不影响另一栏。规则模块模板中已增加“空白次要架势／光环”。
Use the existing spell-category stance format, generally passive. Selection activates the owned module without preparation or slot spending. Replacing one slot preserves the other. A secondary stance/aura blank template is available.

### 骑士六光环 / Six knight auras

示例 `examples/knight-auras/all.json`：三项主要槽、三项次要槽，覆盖全部友军及自己，默认接受，可由接收者取消勾选。主要强度按持有者角色总等级：1—6级1、7—13级2、14—19级3、20级起4。次要强度读取持有者魅力调整值。冲过头通过 recipientWhen 按接收者自己的冲锋状态生效。
The six examples occupy fixed primary/secondary slots, include allies and self, and default to accepted. Major strength uses the source's total level; minor strength uses source Charisma. Charge eligibility is evaluated separately for each recipient.

`criticalConfirmation` 表示重击确认命中加值，不改变普通命中；武器区在有差异时显示独立重击确认数值。其加值类型照常参与合并。
criticalConfirmation modifies confirmation attacks only. Weapon rows show a separate confirmation value when different, with normal bonus stacking.

### 当前坐骑授予 / Grant to the currently ridden companion

非施法的职业／专长能力可用 `grant.mode: "mount"`、`group: "ally"`，仅在来源处于上马状态时向其当前选定的直接部属投送效果。不是全部部属；换坐骑时效果随之转移，下马即撤回。`defaultAccepted: true` 可使坐骑默认接受。
Non-casting abilities may grant to the source's current mount only. Dismounting removes the offer; changing mounts redirects it. Default acceptance remains independently configurable.

示例 `examples/knight-class-abilities/all.json` 含四项职业能力及先声夺人的计时辅助模块。全部等级公式读取持有者总等级。先声夺人使用后立即生效，在下一次本角色回合刷新时失效。资源恢复暂由DM处理。
The example batch contains four class abilities and a timed auxiliary module. All formulas use total character level. First Strike is immediate and expires on the character's next round refresh. Resource recovery is manual.

### 骑乘靴与Lance装备示例 / Riding boots and lance equipment

`examples/lancer-equipment/all.json` 包含六件装备。稳架为无默认开启的布尔参数，装备分配的默认权限允许玩家调整开放参数。锯齿仅作备注，未自动给敌方扣血。胸甲基础护甲6已含强固，另加附魔2，不再重复加一次强固；蔽害只加普通／措手不及的重击确认防御。
The equipment batch contains six items. Brace is a player-editable parameter, initially off. Serration is a manual reminder. Reinforced breastplate armor6 already includes reinforcement, with enhancement2 added separately; confirmation defense excludes touch.

骑乘靴的技能加值独立生效；其伤害倍率输出通过 `requiresOwnedModule: "spirited_charge"` 检查是否拥有奋力冲刺，骑乘冲锋时适用近战×3；通过 `requiredWeaponType: "lance"` 将Lance改成×4。倍率仍取最高，不叠乘。此处只要求拥有该专长，符合用户指定的持有条件。
Riding boots' skill bonus is independent of the feat. Output-level requiresOwnedModule gates the multiplier on ownership of Spirited Charge. requiredWeaponType filters the lance-specific x4 override; other melee uses x3. Multipliers use the highest value.

奔马旗帜持有者始终获得+2命中无名加值；其余友军仅在自己冲锋时获得，自己不再重复接收授予。
The banner grants its wearer +2 unnamed attacks at all times; other allies receive it only while charging, without a duplicate self-grant.

### 巫女射击专长与上马惩罚 / Shrine archer feats and mounted penalties

示例 `examples/shrine-archer-feats/all.json` 含12项专长。和弓专攻匹配 `weapon.type: "yumi"`。近程射击、死亡之眼、快速射击仅作用于远程攻击；距离与武器专攻条件按备忘人工核对后开启。火系DC专攻仅作备注。
The twelve-feat batch includes yumi weapon focus and ranged-only toggles. Range and focus eligibility remain manually adjudicated. Fire spell DC feats are reminders only.

上马默认远程命中-4；骑乘射击在上马时补回+2无名，使最终惩罚为-2。下马两项均撤回。
Mounted ranged attacks take -4; Mounted Archery adds +2 unnamed while mounted, producing -2 total. Both stop on dismount.

咒火护盾资源上限为 `ability.constitution`，即最终体质分数，不是调整值。资源开放手动修改；条件备注按未满／大于0分别显示，不自动吸收、攻击、治疗或消耗。
Spellfire Shield caps at the final Constitution score. Manual resource edits control conditional notes, without automatic damage/healing.

模块可选 `defaultAcquiredLevel` 整数，分配新实例时填入获得等级（快速射击默认7），DM仍可在实例上改动。
An optional integer defaultAcquiredLevel initializes acquisition metadata on assignment; the DM may edit it afterward.

### 五行精髓与超魔减环 / Element essence and metamagic reduction

职业能力也可声明 metamagic，拥有后会自动在施法区出现按钮。五行精髓示例：`slotIncrease: 0`、`slotReduction: 1`、`damageBonus: "mod.intelligence"`。火系适用条件由玩家手动判断，不自动扫描法术描述。
Class abilities may expose casting-option buttons. Element Essence reduces selected metamagic surcharge by one and captures Intelligence modifier as a damage reminder; fire eligibility is manually adjudicated.

额外消耗＝单独高环释放＋MAX(0，超魔升环合计−减环合计)。不降低原法术／原装载环级，不抵消单独高环释放。即使延时的+1被完全抵消，延时效果仍存在，准备型原装载仍会正常消耗。
Extra cost is heighten plus max(0, summed metamagic increases minus reductions). Base/prepared level and independent upcasting are preserved. A fully discounted Extend still doubles duration and consumes the prepared spell.

`damageBonus` 不写入武器伤害，施放时按当时数值生成一回合的独立战斗备忘。之后属性变化不会改写旧备注。具体法术伤害仍手动结算。
Damage bonus is captured in a one-round casting memo, never weapon damage. Later attribute changes do not rewrite the snapshot; spell damage settlement remains manual.

专精五行：火的探测距离使用 `5 * classes.shrine_maiden.level`，即巫女职业等级，而非caster.level。
Fire specialization uses actual shrine-maiden class level for detection distance, not effective caster level.

### 物品施法来源、绑定资源与独立备忘 / Item caster sources, effect-bound resources and independent memos

物品操作声明 `usesCasterLevel: true` 后，资源面板显示施法来源下拉框；只有一个来源时自动选用，多个时自行选择。服务器校验该来源属于角色，公式中的caster.level读取此来源的最终施法者等级。物品操作不消耗该来源的法术位。
Item actions may select an owned casting source. The server validates ownership and uses its effective caster level, without spending spell slots.

资源可声明 `whileEffect: "silence"`，仅在本实例的silence操作所创建的持续记录有效时显示；`hideWhenZero: true` 在值为0时隐藏。消耗操作同样声明whileEffect可阻止到期后继续使用。沉默戒指重新开启时重置本次的3次默发；用尽默发不结束沉默领域。
Resources may be visible only while their source action's timer is active and hide at zero. A similarly bound consume action cannot be used after expiry. Recasting the ring resets its three exemptions; spending all three does not end the silence timer.

`createTimedEffect.independent: true` 为每次操作创建独立记录，适合纠缠护腕追踪不同敌人的持续时间。护腕默认3轮，由DM手动改为实际1d3结果；不会给持有者施加纠缠。
Independent item timers preserve separate uses. Entangling bracer reminders default to three rounds for DM adjustment and never entangle the wearer.

### 接收者条件与专注计时 / Recipient predicates and concentration

`grant.outputs[].recipientWhen` 只读取接收者的 `conditions.*`，在接收者每次计算时重新判断。普通 `when` 仍读取施法者，并在施放时快照。例：给队友飞行速度使用 `{"target":"speed","duration":"short","bonusType":"unnamed","value":"60","recipientWhen":"conditions.fly"}`；收件人落地后撤回速度加值，获得飞行的备忘仍保留。施法者自己是否飞行不影响此判断。
Output-level recipientWhen is evaluated live against the recipient's conditions; ordinary when remains source-side and snapshotted. Landing withdraws the flying-speed bonus without hiding the reminder that flight is available.

`createTimedEffect.concentration: {}` 表示专注期间暂停倒计时；`remaining` 是停止专注后继续存在的轮数，可以为 `"0"`。可选 `concentration.maximum: "caster.level"` 表示专注本身的最长轮数，回合刷新照常扣除，到达上限立即结束。必须同时把 `spell.durationType` 写成 `"concentration"`，这样延时不会放大专注法术。
Concentration pauses the trailing-duration countdown. Remaining is the number of rounds after concentration ends, including zero. An optional maximum limits concentration itself; reaching it ends the effect. Use durationType concentration to exclude Extend.

停止按钮示例：`{"id":"stop_concentration","label":"停止专注","playerUsable":true,"whileEffect":"cast","endConcentration":"cast","changes":[{"target":"module.enabled","value":"true"}]}`。停止后按施放时快照的轮数计时；不消耗第二个法术位。专注计时目前用于自身备忘，不与grant、opening或independent混用。
An endConcentration action starts the snapshotted trailing duration without spending another slot. This interface supports self-side reminders, not targeted grants or phase/independent timers.

`createTimedEffect.when` 可选择是否建立持续记录，例如心灵遥控猛烈发力模式是立即效果。它只控制记录创建，不改变施法位的正常消耗。
The timer-level when controls record creation only; spell-slot spending still occurs normally.

### 子计时、冷却与法术的后续操作 / Child timers, cooldowns and secondary actions

`createTimedEffect.whileEffect: "cast"` 将新的子记录绑定到本实例cast记录；父记录到期、归零或删除后，子记录失效。重新施放父效果会清除旧子记录，避免旧冷却复活。`actions[].unlessEffect: "breathe"` 在对应冷却有效时阻止再次使用。资源和操作原有的 `whileEffect` 继续使用。
A child timer can depend on its parent action's record. Expiry/deletion of the parent disables the child; recasting removes old descendants. UnlessEffect blocks an action while its cooldown is active.

法术的castAction仍只出现在玩家法术资源。停止专注、喷吐等非castAction后续按钮出现在玩家资源，不会重复显示“施放法术”按钮。龙息在施放时用caster.level记录次数；每次使用前外部掷1d4，填入“本次冷却轮数”，再点使用；本网站不代掷骰。
The casting action remains in the spell bar; secondary operations appear in player resources. Dragon Breath snapshots its uses at casting. Roll cooldown externally, enter the result, then use the breath.

### 远程减伤、快捷吸收与重复增益 / Ranged DR, quick increments and duplicate buffs

`rangedDamageReduction` 仅显示对远程武器的减伤，不加入通用damageReduction。防护箭矢用10点远程减伤，并在备注说明“／魔法”；穿透条件与实际伤害仍人工结算。
RangedDamageReduction is displayed separately from general DR. Bypass conditions and actual damage settlement remain manual.

`grant.resources.<key>.quickAdd: {"label":"吸收10","amount":10}` 增加一个快捷按钮，正整数amount，结果最多到max。原有手动修改和endEffectWhenFull仍保留；满后必须确认结束，不会擅自自动消失。
QuickAdd exposes a labeled positive increment, clamped to the resource maximum. Manual editing and the explicit full-pool finish button are preserved.

`grant.stackingKey: "haste"` 让同一接收者已接受的同键增益只计算一份；取消或到期后，另一份仍有效的记录可继续提供效果。不同来源仍保留各自的倒计时。此字段用于无资源的增益，不与grant.resources混用。
Accepted grants sharing a stackingKey contribute once. Timers remain independent, and another valid grant can take over when one ends. This feature is for resource-free grants.

`speedCappedBonus` 用于加速术的速度增强：每项加值不能超过加入该类加值前的速度，再与其他speed来源按加值类型取高。例：原速20时+20，原速60时+30；攀爬原速5时最多+5，不会凭空获得飞行能力。
SpeedCappedBonus caps a movement bonus at the pre-bonus movement speed, then applies normal typed stacking. It doubles a speed of 20 at most, adds 30 to 60, and does not grant a missing movement mode.

### 和弓不计力量伤害 / Yumi ignores Strength damage

武器类型 `weapon.type: "yumi"` 常驻忽略力量带来的伤害调整，正负均为0，不影响命中、伤害骰和其他来源的伤害加值。其他武器也可加 `no_strength_damage` 标签启用相同规则。旧和弓只要type是yumi就直接生效，无需重新导入。
Weapons of type yumi always ignore both positive and negative Strength damage contributions. Other damage modifiers remain intact. Other weapons may opt in with the no_strength_damage tag. Existing yumi definitions work without reimport.

### 按职业等级的领域法术表 / Class-level domain casting sources

`grantsCasting.levelClass: "cleric"` 让独立法术表的基础施法者等级及法术位表所用等级取真实牧师等级；不写时保留天生魔力等原有的角色总等级行为。它不复用牧师整张法术列表，也不消耗牧师原有法术位。法术通过 `spell.classLevels` 中的 `time-domain`／`travel-domain` 映射加入对应领域，法术位由DM独立配置。
LevelClass selects the actual class level for an independent source's base caster level and slot-table row. Omitting it preserves total-character-level behavior. Domain lists and spell slots remain separate from the cleric's original pool.

`examples/cleric-domains/all.json` 是时间领域、旅行领域、法术转换、驱散不死生物四个职业能力。`domain-spells.json` 给之前清单中四项法术补上时间／旅行领域环位：克敌机先1、加速3、飞行3、任意门4。按需导入更新，同ID注意保留已有自定义字段。本职技能仍到DM计算配置的牧师职业中勾选占星术／生存，不在单个角色上另造本职接口。
The four class modules expose the two domains, a conversion reminder, and turning resources. The optional spell update adds the four previously specified domain mappings. Class skills remain configured in the cleric class editor.

旅行领域行动自如次数按 `level`（角色总等级），驱散次数为 `MAX(0,3 + mod.charisma)`。驱散表引用 `classes.cleric.level`，不使用caster.level，附带的施法者等级加值不会提高驱散表的牧师等级。法术转换仅备注，由玩家手动消耗已准备法术位和处理相应备忘。
Travel's daily uses follow total character level. Turning uses actual cleric level for its table and does not inherit caster-level bonuses. Spell conversion is reminder-only, with manual slot spending.

### 法术孪生与额外驱散 / Twin Spell and Extra Turning

超魔可声明 `timedEffectCopies: 2`（只允许1或2，默认1），例如 `"metamagic":{"slotIncrease":4,"timedEffectCopies":2}`。它复制本次新生成的持续记录，不再次执行施放操作，不多扣一个法术位。延时和孪生可同时应用，两份时间均延长；阶段记录分别分组，避免开始阶段互相遮挡。
Metamagic may request two timed-effect copies. Casting actions and costs execute once; newly created records are duplicated with independent lifetimes. Extend applies to both copies, and phased spells retain separate phase groups.

复制的记录有各自ID；同一对的 `twinGroup` 仅用于计算去重，不合并两份备注。友军数值增益不因孪生直接翻倍，但两份都能分别接受、删除和到期；其中一份失效不会让另一份消失。直接伤害、两次豁免及是否允许其他效果叠加由DM裁决。已有角色模块内的同一项资源池不因多一份备忘而复制；法术授予到目标的资源则随各自记录独立保存。
Twin records have independent IDs and a shared numeric-deduplication group. Both reminders remain visible; numeric buffs contribute once while either accepted copy remains active. Damage and saves remain manual. A source module's own pool is not duplicated; target-granted pools remain attached to their separate records.

专注法术仍只有一个“停止专注”操作，会让这对记录一起转入停止后的倒计时。子冷却在任一对应的主记录仍有效时继续存在；重新施放父效果会清理旧的孪生记录和子计时。
A single stop-concentration action starts both trailing countdowns. Child cooldowns remain active while either parent copy survives. Recasting replaces the previous self-effect pair and its children.

`resourceMaxModifiers[].affectsInitial: true` 可让上限修正也影响新资源的初始值；不改变已保存的当前值。额外驱散通过 `tag:"turn_undead", resource:"turns", value:"4", bonusType:"unnamed", affectsInitial:true` 连接已有驱散池；驱散模块需有 `tags:["turn_undead"]`。不拥有驱散池时，不创建一个新池。
An affectsInitial capacity modifier also changes initial values for newly initialized resources, without refilling saved current values. Extra Turning targets the existing tagged turning pool and does not create one if absent.

八项示例及配套驱散更新位于 `examples/cleric-metamagic-feats/with-turning-update.json`。法术扩展按本团指定+1环；瞬发／扩展／增远的动作、范围和距离按描述人工处理。神圣超魔仅备注。
The batch includes eight feats plus the compatible turning definition. Widen uses the explicitly requested +1 slot house rule. Action economy, areas/ranges, and Divine Metamagic are manually adjudicated.

### 消耗型充能不参与恢复 / Nonrenewable charges

资源可写 `"rechargeable": false`。任何自动恢复操作都必须尊重此标记；当前回合／战斗恢复即使配置了refresh也不会回填该资源。未来每日恢复按钮同样复用 `canAutoRefreshResource` 判断。DM仍可按实际情况手动修改充能，本标记不禁止人工修正存档。
Resources marked rechargeable false are excluded from automatic recovery, including configured round/battle resets. Future daily recovery must use the same canAutoRefreshResource gate. DM corrections remain possible.

`examples/cleric-equipment/all.json` 包含12件装备；`with-turning-update.json` 另附驱散标签兼容更新。破敌钉头锤使用可编辑的邪恶异界目标布尔参数，将该武器增强从1改为3，并附加2d6；不会用两项增强互相取高导致少算。重盾的基础2＋自身增强1合为盾牌贡献3，和盔甲自身增强分别计算。
The item batch contains twelve items. The bane parameter changes the weapon's enhancement from one to three and adds 2d6. Shield enhancement is included in its own shield contribution, so it stacks with the armor's own enhancement.

夜之杖沿用驱散池上限／初始修正，不凭空创建资源，不自动回填旧当前次数。延时权杖按本次需求只记录3次使用和提示，不自动改变本次施法持续时间。次级回春术法杖共50次、不自动恢复，仅描述每次在11轮恢复11HP，不自动治疗。所有这些物品资源仅在装备后出现。
Nightstick modifies an existing turning pool without refilling saved uses. The Extend rod is reminder/resource-only. The 50-charge rejuvenation wand describes gradual healing without modifying HP automatically. Item resources appear only while equipped.

### 情境防御、游泳豁免与近战增益 / Contextual AC, swimming and melee-only grants

输出的 `context` 现在也适用于 `defenseCommon`、`defense`、`touchDefense`、`flatDefense`。它不进入通常AC，只在对应情境行展示；合并时仍按加值类型取高，不把一个被更高偏斜压制的+2继续相加。防护邪恶示例使用“对抗邪恶生物”，豁免采用同名情境。是否处于情境由DM判断。
Defense outputs may have context labels. They appear in scenario totals, not baseline AC, and use normal typed stacking. Evil-specific deflection is not added on top of a higher existing deflection bonus.

`ignoreSwimPenalty` 为正时，仅忽略swim状态自身的速度倍率；不会取消疲乏、纠缠或其他状态／装备造成的减速。行动自如的其他免疫仍是人工裁决的备注。结束或取消接受后，游泳倍率正常恢复。
A positive ignoreSwimPenalty removes only the swim condition's movement multiplier. Other penalties remain. The spell's broader immunities are reminders for adjudication.

`grant.outputs` 的 `damage` 和 `attackCount` 可写 `attackMode: "melee"` 或 `"ranged"`，不需要weapon scope；仅在对应武器行计算。它们不混入通用伤害／次数。命中仍用melee或ranged目标。
Granted damage and attack-count outputs may be limited by attackMode and apply only to the corresponding weapon rows. They do not inflate mode-independent totals.

攻击次数输出可写 `attackGroup: "magical_extra_attack"`；同组的正值只取最高，负值独立取最小，其他无组来源仍按原有规则计算。加速术和信仰之怒使用同组，因此近战不会拿到两次相同来源性质的额外攻击；远程只能获得加速术的那次。需要不叠加的其他魔法攻击来源可用同一组。
Attack-count outputs can share an attackGroup. Only the highest positive and lowest negative in that group contribute. Haste and Righteous Wrath share a group; other ungrouped sources retain their normal behavior.

神导术把+1表现列入命中、豁免及57项技能，只有一次检定可用，使用后必须关闭接受或删除记录。护卫他人的施法者备注标题显示目标名，接收者备注来源显示施法者名；伤害转移不自动扣血。法术免疫的具体法术名单由DM记录，不自动选择或抵销对方施法。
Guidance exposes its one-use competence bonus across eligible rolls for convenience; consume it manually. Shield Other identifies parties through record headers/source labels, without transferring HP automatically. Spell Immunity's selected spell names are recorded manually.

### 全天恢复与手动备注 / Daily recovery and manual notes

速算卡的「全天恢复（DM）」恢复可恢复资源至各自初始值，恢复各职业法术位与准备次数，并清空状态、持续效果和回合数；生命值不变。「恢复至满血」是独立的 DM 操作，使用当前计算出的生命上限。`rechargeable: false` 的资源不被自动恢复。装备选择与手动纯文字备注保留。

Quick card **Daily recovery (GM)** restores rechargeable resources to their initial values, resets spell uses and preparations, and clears conditions, timed effects and the round counter. HP is unchanged; **Full heal** is a separate GM action using the computed maximum HP. Resources with `rechargeable: false` keep their charges. Equipment selections and manual notes are retained.

每类备忘标题后的「＋」可添加纯文字，支持换行，不解释公式。存放于角色 `rule_state.manualNotes`：`[{"id":"unique-id","category":"combat","text":"文字"}]`；类别另可为 `negative`、`noncombat`。

The **+** beside each memo heading adds plain text with line breaks; formulas are not evaluated. Notes are stored in `rule_state.manualNotes` as shown above; categories are `combat`, `negative`, and `noncombat`.

### DM 集中查看、审查与法术 DC / GM overview, review and spell DC

DM 集中查看排除从属；先攻加值与实际先攻结果分开，结果降序排列，可添加临时参战者并移动当前行动游标。先攻列表保存在当前浏览器。统一查看与技能表使用角色当前计算结果和接受的共享效果。

法术 DC 仅用于实际职业中的牧师、机关术师、巫女，公式为10＋环位＋感知／智力调整＋长效短效。可在角色 `rule_state.spellDcEffects[classId]` 使用 `{long:[],short:[]}` 来源组调整；额外生成的法术表不显示DC。

审查记录从更新后成功保存的动作开始生成，存放在角色 `rule_state.auditLog`，随角色导出保存。仅DM可移除记录；审查不更改角色数值或效果。同一施法操作及其资源变更合并为一条记录。未保存的勾选不记日志。

The GM overview excludes companions, uses live character calculations, and provides a descending initiative tracker with a current-turn marker. The tracker is saved in this browser. Spell DC uses actual cleric/artificer/shrine-maiden classes only: 10 + spell level + Wisdom/Intelligence modifier + long/short adjustments. Per-class adjustments use `rule_state.spellDcEffects[classId]`. Reviews store successful saved actions in `rule_state.auditLog`; GM approval removes records only and never reverts effects. New records begin after this update.

### 公共卷轴 / Shared scrolls

入口：侧栏「公用道具」。DM可搜索普通法术、添加卷轴、设置数量和移除库存条目；玩家只能选择自己控制的非部属角色，搜索公共库存并消耗施放。架势／光环槽位、标记为武术的定义、仅属于十字军／战刃的武术不列入卷轴。

卷轴环位优先取 `spell.classLevels` 全部映射的最低值（包括0环），没有映射时才用 `spell.level`。卷轴施法者等级为 `MAX(1,环位*2-1)`，不会叠加使用者的施法者等级修正，不消耗其法术位，也没有高环／超魔选项。法术仍需要已配置有效环位；修改法术定义的环位会影响之后施放的卷轴。

点库存法术查看描述，再选目标与施法参数，确认现场检定后点击「消耗一张并施放」。使用现有的法术授予、技能选择、能量选择、持续备忘与对方接受机制；普通自身增益作用于使用者。原法术仅允许从属／坐骑等目标时仍遵守其目标限制。立即法术按现有定义结算，不自动扣敌人生命。失败的目标／参数校验不扣库存。库存变更与施放一起校验版本，拒绝超用或过期提交。没有新增自动UMD检定或“检定失败消耗”规则，DM可按实际情况调整库存。

卷轴UMD对照排除部属，使用已生效效果及所有包含“卷轴”的条件加值，按照现有加值叠加规则计算，并可展开查看纳入的条件。检定是否适用仍由DM判断。

卷轴使用写入使用者的DM审查记录；使用过的卷轴效果不会加入其掌握法术列表。全天恢复不会补充公共库存。本机库存存于 `viola-scrolls`，导出记录包含顶层 `scrolls` 字段；同源浏览器标签页通过本机锁和storage通知协调，跨设备共享需要Supabase。

云端使用需执行 `014_shared_scrolls.sql` 并部署最新 `module-state`。库存对战役成员可读，仅DM可修改；消耗由服务端核对角色权限和法术定义，通过单个数据库事务提交库存扣减与角色效果。版本冲突、角色提交失败时不扣库存。

**Shared scrolls** live under Common Items. GM manages stock; players use their controlled main character. Scroll spell level is the minimum explicit class mapping, falling back to the default level only when mappings are absent. Fixed caster level is `MAX(1,2*level-1)`; personal caster-level bonuses, spell slots and metamagic do not apply. Targets, cast parameters and timed effects reuse the normal spell engine. Stock is consumed only after validation. Scroll-use effects do not teach spells, and daily recovery does not refill shared stock. Scroll UMD includes applicable scroll-context modifiers and excludes companions. Local exports include `scrolls`; cross-device use requires migration 014 and the updated endpoint, which commit stock and character changes atomically.

固定双人等多选法术可设置 `grant.targetCount: 2`（1～200整数，仅用于spell类型且mode为multiple）。普通施法和卷轴施法均须选恰好对应数量的不同目标；界面限制继续勾选，服务器再次校验，失败不消耗。距离／目标资格仍由DM判断。

For a spell with `grant.mode: "multiple"`, optional `grant.targetCount: 2` requires exactly two distinct targets. Both regular and scroll casting enforce this before consuming resources; range and situational eligibility remain GM decisions.

当卷轴最低职业环位与仍保留的职业映射不同，可填写 `spell.scrollLevel`（0～20整数）记录已核对的卷轴最低环位。此值仅用于公共卷轴：例如 `scrollLevel:1, classLevels:{cleric:2}` 表示卷轴一环、牧师二环。未填写时仍从职业映射取最低值，无映射才用默认level；普通职业施法始终按classLevels，不受scrollLevel影响。

Optional `spell.scrollLevel` preserves a verified minimum scroll level when other profession mappings are omitted. It affects only shared scrolls; normal class casting continues to use classLevels. Without this field, the original minimum-mapping/fallback behavior is unchanged.

### DM临时调整与负向等级 / GM adjustments and negative levels

仅DM可操作：「统一查看」顶部展开“DM临时调整”后选择角色；「当前状态」使用当前角色。可为六维、生命上限、命中、豁免、全部技能、速度、防御、抗性、伤害骰、攻击次数、施法者等级及三类施法职业DC添加带名称的长效／短效数值来源，可启停或移除；按原有加值类型叠加。技能点来源仍只支持长效。条件数值填写情境文字；伤害骰另选骰面。直接当前值区可修改当前生命、临时生命、潜能点和角色已有资源当前值，仍接受整数／资源范围校验。

手动来源保存在 `rule_state.dmBuffs`，例如：

```json
{"id":"drain-1","name":"负向等级","target":"negativeLevels","value":1,"bonusType":"unnamed","duration":"short","enabled":true}
```

负向等级只由DM手动添加，不是普通能力输出，不会由法术自动生成。按最后获得等级的逆序计算有效职业等级，最低0；原职业顺序不删除。停用获得等级高于当前有效总等级的职业能力／专长，以及其自动授予的子模块。其他未填获得等级的职业能力／专长保留并在负面备忘提示；旧手填属性来源缺乏等级记录时不能追溯，需DM裁决。手动来源也可填 `acquiredLevel`；负向等级自身不按获得等级停用，以免循环。

生命上限、BAB、豁免、攻击次数、等级变量、职业施法者等级及职业法术位改按有效等级；固定位阶卷轴CL不受影响。技能投入、投入上限和技能点预算保留原等级计算（包括原本长效属性及能力对技能点的贡献），技能检定自身仍使用当前属性／能力效果。已准备但临时超出法术位的记录封存保留，不能施放，恢复等级后重新可用。已用法术位、当前生命和资源的原始数值不会为模拟降级而删除。去掉或关闭负向等级后自动恢复原等级计算及原模块权限；不会额外补满资源。

临时调整不带自动倒计时，持续到DM关闭或移除。它们作为手动数值来源保留，不由回合／全天恢复自动删除。显示的条件来源不等于自动判定战场条件。负向等级下调资源上限时，原当前值可能暂时高于新上限，可由DM裁决或手动调整。

The GM-only adjustment panel supports named additive sources, typed stacking, enable/remove controls and direct HP/resource values. `rule_state.dmBuffs` stores adjustments. Manual `negativeLevels` temporarily removes levels from the end of the saved multiclass sequence, suppressing class/feat instances whose acquiredLevel exceeds the effective total. Untagged sources remain with a warning. Original levels, skill investments/training budgets, spell preparations and resource values are retained. Class spell slots and caster levels use the effective level; fixed scroll CL does not. Removing the adjustment restores calculations without refilling resources. Manual sources persist until the GM removes or disables them.
