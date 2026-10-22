import {attemptTurns} from '../../../../lib/task-attempt';
import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {and,eq} from 'drizzle-orm';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getDb} from '../../../../db';
import {executions} from '../../../../db/schema';
import {AgentClient} from '../../../../lib/agent-client';
export async function POST(req:Request){
 const headers={'Cache-Control':'private, no-store'};
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401,headers});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Request rejected.'},{status:403,headers});
 try{
  const raw=await req.text();if(raw.length>500)throw new Error();
  const {taskId}=z.object({taskId:z.string().uuid()}).parse(JSON.parse(raw));
  const db=getDb(),where=and(eq(executions.owner,user.userId),eq(executions.id,taskId));
  const task=(await db.select().from(executions).where(where))[0];
  if(!task)return Response.json({error:'Task not found.'},{status:404,headers});
  if(!['starting','submitting'].includes(task.status))return Response.json({ok:true},{headers});
  const client=new AgentClient((env as unknown as Record<string,string>).OPENAI_API_KEY);
  const sessionId=task.sessionId??(await client.recover(task.submissionKey))?.id;
  if(!sessionId)return Response.json({error:'No matching session was found. No replacement was started.'},{status:409,headers});
  await db.update(executions).set({sessionId,status:'submitting',updatedAt:new Date().toISOString()}).where(where);
  const current=await client.inspect(sessionId);
  if(current.session.status==='failed')throw new Error();
  const turns=attemptTurns(current.turns,task.input);
  if(!turns.length)await client.submit(sessionId,task.input,task.submissionKey);
  await db.update(executions).set({status:'running',error:null,turnId:turns[0]?.id??null,updatedAt:new Date().toISOString()}).where(where);
  return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'Recovery could not be confirmed. The existing task was not replaced.'},{status:503,headers});}
}
