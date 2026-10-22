import {reconcileTask} from '../../../lib/reconcile-task';
import {env} from 'cloudflare:workers';
import {and,eq,gte} from 'drizzle-orm';
import {z} from 'zod';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '../../../db';
import {executions,profiles} from '../../../db/schema';
import {AgentClient} from '../../../lib/agent-client';
import {shopifyGraphql} from '../../../lib/shopify';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
function publicTask(row:typeof executions.$inferSelect){return {id:row.id,title:JSON.parse(row.input).request,status:row.status,error:row.error,result:row.result?JSON.parse(row.result):null,createdAt:row.createdAt};}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401,headers});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Request rejected.'},{status:403,headers});
 const key=(env as unknown as Record<string,string>).OPENAI_API_KEY;if(!key)return Response.json({error:'AI setup is required.'},{status:503,headers});
 const db=getDb();let taskId:string|undefined;
 try{
  const raw=await req.text();if(raw.length>7000)return Response.json({error:'Request too large.'},{status:413,headers});
  const body=z.object({id:z.string().uuid(),prompt:z.string().trim().min(3).max(5000),shop:z.string().max(200).optional()}).parse(JSON.parse(raw));taskId=body.id;
  const where=and(eq(executions.owner,user.userId),eq(executions.id,body.id));
  const previous=(await db.select().from(executions).where(where))[0];
  if(previous)return Response.json({task:publicTask(previous)},{headers});
  const recent=await db.select().from(executions).where(and(eq(executions.owner,user.userId),gte(executions.createdAt,new Date(Date.now()-3600000).toISOString())));
  if(recent.length>=5)return Response.json({error:'Five tasks per hour are allowed during the pilot.'},{status:429,headers});
  const profile=(await db.select().from(profiles).where(eq(profiles.owner,user.userId)))[0];
  const catalog=body.shop?await shopifyGraphql(user.userId,body.shop,'query { shop { name currencyCode } products(first:20) { nodes { title description onlineStoreUrl } } }'):null;
  const now=new Date().toISOString(),submissionKey=crypto.randomUUID();
  const input=JSON.stringify({request:body.prompt,profile:profile?JSON.parse(profile.payload):{},selectedStore:body.shop??null,catalog});
  const inserted=await db.insert(executions).values({owner:user.userId,id:body.id,submissionKey,status:'starting',input,createdAt:now,updatedAt:now}).onConflictDoNothing().returning();
  if(!inserted.length)return Response.json({error:'Task is already starting. Refresh its status.'},{status:409,headers});
  const client=new AgentClient(key),session=await client.create(body.id,submissionKey);
  await db.update(executions).set({sessionId:session.id,status:'submitting',updatedAt:new Date().toISOString()}).where(where);
  await client.submit(session.id,input,submissionKey);
  await db.update(executions).set({status:'running',updatedAt:new Date().toISOString()}).where(where);
  return Response.json({task:{id:body.id,status:'running',createdAt:now}},{status:202,headers});
 }catch{
  // A transport error does not prove that remote creation or submission failed.
  if(taskId)await db.update(executions).set({error:'Connection interrupted. Check this task before starting another.',updatedAt:new Date().toISOString()}).where(and(eq(executions.owner,user.userId),eq(executions.id,taskId)));
  return Response.json({error:'Could not confirm task startup. Refresh to check its status.',taskId},{status:503,headers});
 }
}
export async function GET(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401,headers});
 const db=getDb(),taskId=new URL(req.url).searchParams.get('id');
 if(!taskId){const rows=await db.select().from(executions).where(eq(executions.owner,user.userId));return Response.json({tasks:rows.map(publicTask)},{headers});}
 const where=and(eq(executions.owner,user.userId),eq(executions.id,taskId));
 const row=(await db.select().from(executions).where(where))[0];if(!row)return Response.json({error:'Task not found.'},{status:404,headers});
 if(!row.sessionId||['review','failed','cancelled'].includes(row.status))return Response.json({task:publicTask(row)},{headers});
 const key=(env as unknown as Record<string,string>).OPENAI_API_KEY;
 try{
  const result=await reconcileTask(row,key);
  return Response.json({task:{...publicTask(result.row),approvals:result.approvals}},{headers});
 }catch{return Response.json({task:publicTask(row),warning:'Could not refresh. The existing task has not been restarted.'},{headers});}
}
