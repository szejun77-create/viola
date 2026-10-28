export type LinkedCharacter={id:string;owner_id:string|null;master_id?:string|null};
// A companion follows its master's account, never a stale direct assignment.
export function canControlCharacter(c:LinkedCharacter,characters:readonly LinkedCharacter[],user:string|null,gm=false){
 if(!user)return false;if(gm)return true;
 if(c.master_id){const master=characters.find(x=>x.id===c.master_id);return !!master&&!master.master_id&&master.owner_id===user}
 return c.owner_id===user;
}
export function validateMasterLink(c:LinkedCharacter,masterId:string|null,characters:readonly LinkedCharacter[]){
 if(!masterId)return;
 const master=characters.find(x=>x.id===masterId);
 if(!master)throw Error('主人角色不存在');
 if(masterId===c.id)throw Error('角色不能成为自己的主人');
 if(master.master_id)throw Error('请选择独立角色作为主人');
 if(characters.some(x=>x.master_id===c.id))throw Error('此角色已有从属，请先解除其从属关联');
}
