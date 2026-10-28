import type {Mechanics} from './mechanics';
import type {RuleState} from './rule-types';
import {ruleCatalog,referencedModuleIds,validateCatalog} from './rule-schema';
import {validateSpellConfiguration} from './spell-preparation';
export interface ModuleUser {id:string;name:string;rule_state?:RuleState|null}
export function moduleDeletionInfo(config:Mechanics,id:string,characters:ModuleUser[]){const catalog=ruleCatalog(config),module=catalog.modules[id];if(!module)throw Error('该模块已不存在');return {module,users:characters.filter(c=>c.rule_state?.instances.some(i=>i.moduleId===id)),references:Object.values(catalog.modules).filter(m=>m.id!==id&&referencedModuleIds(m).includes(id))}}
export function deleteModuleDefinition(config:Mechanics,id:string,characters:ModuleUser[]){const info=moduleDeletionInfo(config,id,characters);if(info.users.length)throw Error('请先从使用该模块的角色身上移除，再删除规则定义');if(info.references.length)throw Error('请先修改其他模块对它的引用');const modules={...ruleCatalog(config).modules};delete modules[id];const next={...config,modules};validateCatalog(ruleCatalog(next));validateSpellConfiguration(next);return next}
