import {env} from 'cloudflare:workers';
import {eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {executions} from '../../../../db/schema';
import {verifySessionEvent} from '../../../../lib/webhook-event';
import {reconcileTask} from '../../../../lib/reconcile-task';
export async function POST(req:Request){
 const headers={'Cache-Control':'no-store'};
 const cfg=env as unknown as Record<string,string>;
 if(!cfg.OPENAI_WEBHOOK_SECRET||!cfg.OPENAI_API_KEY)return Response.json({error:'Webhook not configured.'},{status:503,headers});
 if(Number(req.headers.get('content-length'))>65536)return new Response(null,{status:413,headers});
 const reader=req.body?.getReader();if(!reader)return new Response(null,{status:400,headers});
 const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>65536){await reader.cancel();return new Response(null,{status:413,headers});}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let event;
 try{event=await verifySessionEvent(new TextDecoder().decode(bytes),req.headers,cfg.OPENAI_WEBHOOK_SECRET);}catch{return new Response(null,{status:400,headers});}
 if(!event)return new Response(null,{status:204,headers});
 try{
  // Owner is resolved from server records, never from the webhook body.
  const rows=await getDb().select().from(executions).where(eq(executions.sessionId,event.data.id)).limit(2);
  if(!rows.length)return new Response(null,{status:204,headers});
  if(rows.length!==1)throw Error('Ambiguous session');
  const result=await reconcileTask(rows[0],cfg.OPENAI_API_KEY);
  if(result.row.status==='verifying')return new Response(null,{status:503,headers});
  return new Response(null,{status:204,headers});
 }catch{return new Response(null,{status:503,headers});}
}
