import {shopifyGraphql} from '../../../lib/shopify';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { profiles,items } from '../../../db/schema';
import { and,eq,sql } from 'drizzle-orm';
import { z } from 'zod';
import { generateBrief } from '../../../lib/ai';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to use the assistant.'},{status:401,headers});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Request rejected.'},{status:403,headers});
 const key=(env as unknown as Record<string,string>).OPENAI_API_KEY;if(!key)return Response.json({error:'AI connection has not been configured.'},{status:503,headers});
 let id='';try{
 const raw=await req.text();if(raw.length>7000)throw new Error('Please keep your request under 5,000 characters.');
 const body=z.object({id:z.string().uuid(),prompt:z.string().trim().min(3).max(5000),shop:z.string().max(200).optional(),mode:z.string().max(100).optional()}).parse(JSON.parse(raw));id=body.id;const db=getDb();
 const prior=await db.select().from(items).where(and(eq(items.owner,user.userId),eq(items.kind,'request')));
 const duplicate=prior.find(v=>v.id===id);if(duplicate)return Response.json({item:JSON.parse(duplicate.payload)},{headers});
 const recent=prior.filter(v=>Date.parse(v.updatedAt)>Date.now()-60000);if(recent.length>=3)return Response.json({error:'Please wait a minute before another request.'},{status:429,headers});
 const now=new Date().toISOString();const item={id,kind:'request',title:body.prompt.slice(0,100),prompt:body.prompt,body:'',url:'',status:'running',createdAt:now};
 const inserted=await db.insert(items).values({owner:user.userId,id,kind:'request',payload:JSON.stringify(item),updatedAt:now}).onConflictDoNothing().returning({id:items.id});if(!inserted.length)return Response.json({error:'This request is already being processed.'},{status:409,headers});
 const p=await db.select().from(profiles).where(eq(profiles.owner,user.userId));
 const history=prior.sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt)).slice(-3).map(x=>{const v=JSON.parse(x.payload);return `User: ${v.prompt}\nAssistant: ${v.body}`}).join('\n').slice(-12000);
 let storeContext:unknown=null;if(body.shop){storeContext=await shopifyGraphql(user.userId,body.shop,'query { shop { name primaryDomain { url } } products(first: 20, sortKey: UPDATED_AT, reverse: true) { nodes { title description onlineStoreUrl } } }');}
 const context={...(p[0]?JSON.parse(p[0].payload):{}),selectedStore:body.shop,storeCatalog:storeContext,task:body.mode};
 const answer=await generateBrief(key,body.prompt,context,history);
 const result={...item,body:answer.text,sources:answer.sources,status:'review'};
 await db.update(items).set({payload:JSON.stringify(result),updatedAt:new Date().toISOString()}).where(and(eq(items.owner,user.userId),eq(items.id,id)));
 return Response.json({item:result},{headers});
 }catch(e){const error=e instanceof Error?e.message:'Request failed.';if(id){const db=getDb();const row=await db.select().from(items).where(and(eq(items.owner,user.userId),eq(items.id,id)));if(row[0])await db.update(items).set({payload:JSON.stringify({...JSON.parse(row[0].payload),status:'failed',body:error})}).where(and(eq(items.owner,user.userId),eq(items.id,id)));}return Response.json({error},{status:502,headers});}
}
