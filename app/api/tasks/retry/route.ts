import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {and,eq} from 'drizzle-orm';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getDb} from '../../../../db';
import {executions} from '../../../../db/schema';
import {AgentClient} from '../../../../lib/agent-client';
import {retryableFailure} from '../../../../lib/task-attempt';
export async function POST(req:Request){
 const headers={'Cache-Control':'private, no-store'};
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401,headers});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Request rejected.'},{status:403,headers});
 try{
  const raw=await req.text();if(raw.length>500)throw new Error();
  const {taskId}=z.object({taskId:z.string().uuid()}).parse(JSON.parse(raw));
  const db=getDb(),where=and(eq(executions.owner,user.userId),eq(executions.id,taskId));
  const task=(await db.select().from(executions).where(where))[0];
  if(!task?.sessionId)return Response.json({error:'Task not found.'},{status:404,headers});
  if(task.status!=='failed')return Response.json({error:'This task is not waiting for a retry.'},{status:409,headers});
  const client=new AgentClient((env as unknown as Record<string,string>).OPENAI_API_KEY),current=await client.inspect(task.sessionId);
  const latest=current.turns[0];
  if(current.session.status!=='idle'||latest?.id!==task.turnId||latest.status!=='failed'||!retryableFailure(latest.error))return Response.json({error:'The current execution cannot safely be retried.'},{status:409,headers});
  const previous=JSON.parse(task.input);
  if((previous._attempt??0)>=2)return Response.json({error:'Two retries have failed. Wait for the service to recover.'},{status:429,headers});
  const input=JSON.stringify({...previous,_attempt:(previous._attempt??0)+1,_previousTurnIds:current.turns.map(t=>t.id)}),submissionKey=crypto.randomUUID();
  const claimed=await db.update(executions).set({input,submissionKey,status:'submitting',turnId:null,error:null,updatedAt:new Date().toISOString()}).where(and(where,eq(executions.status,'failed'),eq(executions.submissionKey,task.submissionKey))).returning();
  if(!claimed.length)return Response.json({error:'A retry is already starting.'},{status:409,headers});
  await client.submit(task.sessionId,input,submissionKey);
  await db.update(executions).set({status:'running',updatedAt:new Date().toISOString()}).where(and(where,eq(executions.submissionKey,submissionKey),eq(executions.status,'submitting')));
  return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'Retry startup could not be confirmed. Use Recover existing task; do not create a new task.'},{status:503,headers});}
}
