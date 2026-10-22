import {env} from 'cloudflare:workers';
import {and,eq} from 'drizzle-orm';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getDb} from '../../../../db';
import {executions} from '../../../../db/schema';
import {AgentArtifacts} from '../../../../lib/agent-artifacts';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401,headers});
 const params=new URL(req.url).searchParams;
 const task=(await getDb().select().from(executions).where(and(eq(executions.owner,user.userId),eq(executions.id,params.get('task')??''))))[0];
 if(!task?.sessionId||!task.turnId)return Response.json({error:'File not found.'},{status:404,headers});
 try{
  const client=new AgentArtifacts((env as unknown as Record<string,string>).OPENAI_API_KEY);
  const artifact=(await client.list(task.sessionId,task.turnId)).find(a=>a.id===params.get('artifact'));
  if(!artifact)return Response.json({error:'File not found.'},{status:404,headers});
  const preview=params.get('preview')==='1';
  const mime=artifact.path.toLowerCase().endsWith('.mp4')?'video/mp4':artifact.path.toLowerCase().endsWith('.webm')?'video/webm':null;
  if(preview&&!mime)return Response.json({error:'This file cannot be previewed.'},{status:415,headers});
  const content=await client.content(task.sessionId,artifact.id);
  const name=(artifact.path.split('/').pop()??'download').replace(/[^a-zA-Z0-9._-]/g,'_');
  return new Response(content.body,{headers:{...headers,'Content-Type':preview?mime!:'application/octet-stream','Content-Disposition':`${preview?'inline':'attachment'}; filename="${name}"`}});
 }catch{return Response.json({error:'Download unavailable. Try again.'},{status:503,headers});}
}
