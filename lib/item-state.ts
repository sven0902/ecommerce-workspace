import {z} from 'zod';
export const statePatchSchema=z.object({id:z.string().uuid(),field:z.enum(['testing','tested','dismissed']),value:z.boolean()}).strict();
export function itemFlags(item:{status:string;testing?:boolean;tested?:boolean;dismissed?:boolean}){
 return {testing:item.testing??item.status==='testing',tested:item.tested??item.status==='tested',dismissed:item.dismissed??item.status==='invalid'};
}
export function matchesState(item:Parameters<typeof itemFlags>[0],filter:string){
 const f=itemFlags(item);
 if(filter==='invalid')return f.dismissed;
 if(f.dismissed)return false;
 if(filter==='testing'||filter==='tested')return f[filter];
 if(filter==='review')return !f.testing&&!f.tested&&['review','testing','tested','invalid'].includes(item.status);
 return filter==='all'||item.status===filter;
}
export function stateLabel(item:Parameters<typeof itemFlags>[0]){
 const f=itemFlags(item);
 return f.dismissed?'Invalid':f.testing&&f.tested?'Testing · Tested':f.testing?'Testing':f.tested?'Tested':['testing','tested','invalid'].includes(item.status)?'Review':item.status;
}
