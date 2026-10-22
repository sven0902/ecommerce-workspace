import OpenAI from 'openai';
import {z} from 'zod';
const eventSchema=z.object({id:z.string(),type:z.string(),data:z.object({id:z.string().regex(/^sess_[a-zA-Z0-9_-]+$/)})});
export async function verifySessionEvent(body:string,headers:Headers,secret:string){
 // Signature and freshness checks come from the official SDK, before parsing.
 const client=new OpenAI({apiKey:'signature-verification-only',webhookSecret:secret});
 await client.webhooks.verifySignature(body,headers);
 const event=eventSchema.parse(JSON.parse(body));
 return ['agent.session.idle','agent.session.failed','agent.session.action_required'].includes(event.type)?event:null;
}
