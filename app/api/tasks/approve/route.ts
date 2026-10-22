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
  const raw=await req.text();if(raw.length>2000)throw new Error('Invalid request.');
  const input=z.object({taskId:z.string().uuid(),requestId:z.string().max(200),decision:z.enum(['approve','deny','cancel'])}).parse(JSON.parse(raw));
  const task=(await getDb().select().from(executions).where(and(eq(executions.owner,user.userId),eq(executions.id,input.taskId))))[0];
  if(!task?.sessionId)return Response.json({error:'Task not found.'},{status:404,headers});
  await new AgentClient((env as unknown as Record<string,string>).OPENAI_API_KEY).approveOrigin(task.sessionId,input.requestId,input.decision);
  return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'Could not confirm this decision. Refresh the task before trying again.'},{status:409,headers});}
}
