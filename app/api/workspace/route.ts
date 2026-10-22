import { shopifyConfig } from '../../../lib/shopify';
import { stores,executions } from '../../../db/schema';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { profiles,items } from '../../../db/schema';
import { defaultProfile,profileSchema,itemSchema } from '../../../lib/workspace';
import {statePatchSchema} from '../../../lib/item-state';
import { and,eq,sql } from 'drizzle-orm';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to open your workspace.'},{status:401,headers});
 try{const db=getDb();const [p,i,connected,tasks]=await Promise.all([db.select().from(profiles).where(eq(profiles.owner,user.userId)),db.select().from(items).where(eq(items.owner,user.userId)),db.select({shop:stores.shop,name:stores.name,connectedAt:stores.connectedAt}).from(stores).where(eq(stores.owner,user.userId)),db.select({id:executions.id}).from(executions).where(eq(executions.owner,user.userId))]);return Response.json({taskCount:tasks.length,profile:p[0]?JSON.parse(p[0].payload):defaultProfile,items:i.map(x=>JSON.parse(x.payload)),capabilities:{ai:Boolean((env as unknown as Record<string,string>).OPENAI_API_KEY),shopify:shopifyConfig().configured},stores:connected,user:user.displayName},{headers});}catch{return Response.json({error:'Workspace storage is unavailable. Please try again.'},{status:503,headers});}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401,headers});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Request origin rejected.'},{status:403,headers});
 if(Number(req.headers.get('content-length'))>30000)return Response.json({error:'Request too large.'},{status:413,headers});
 try{const raw=await req.text();if(raw.length>30000)return Response.json({error:'Request too large.'},{status:413,headers});const body=JSON.parse(raw);const db=getDb();
 if(body.action==='profile'){const p=profileSchema.parse(body.value);await db.insert(profiles).values({owner:user.userId,payload:JSON.stringify(p)}).onConflictDoUpdate({target:profiles.owner,set:{payload:JSON.stringify(p)}});return Response.json({ok:true},{headers});}
 if(body.action==='itemState'){
  const patch=statePatchSchema.parse(body.value);
  const updated=await db.update(items).set({payload:sql`json_set(${items.payload}, ${'$.'+patch.field}, json(${JSON.stringify(patch.value)}))`,updatedAt:new Date().toISOString()}).where(and(eq(items.owner,user.userId),eq(items.id,patch.id))).returning();
  if(!updated.length)return Response.json({error:'Item not found.'},{status:404,headers});
  return Response.json({item:JSON.parse(updated[0].payload)},{headers});
 }
 if(body.action==='item'){const parsed=itemSchema.parse(body.value);const previous=(await db.select().from(items).where(and(eq(items.owner,user.userId),eq(items.id,parsed.id))))[0];const stored=previous?JSON.parse(previous.payload):null;const item={...parsed,...(stored?{testing:stored.testing,tested:stored.tested,dismissed:stored.dismissed}:{}),...(stored?.execution?{execution:stored.execution}:{})};await db.insert(items).values({owner:user.userId,id:item.id,kind:item.kind,payload:JSON.stringify(item),updatedAt:new Date().toISOString()}).onConflictDoUpdate({target:[items.owner,items.id],set:{kind:item.kind,payload:JSON.stringify(item),updatedAt:new Date().toISOString()}});return Response.json({ok:true},{headers});}
 return Response.json({error:'Unknown operation.'},{status:400,headers});
 }catch{return Response.json({error:'Could not save. Check your input and try again.'},{status:400,headers});}
}
