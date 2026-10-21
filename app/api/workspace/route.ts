import { shopifyConfig } from '../../../lib/shopify';
import { stores } from '../../../db/schema';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { profiles,items } from '../../../db/schema';
import { defaultProfile,profileSchema,itemSchema } from '../../../lib/workspace';
import { and,eq } from 'drizzle-orm';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to open your workspace.'},{status:401,headers});
 try{const db=getDb();const [p,i,connected]=await Promise.all([db.select().from(profiles).where(eq(profiles.owner,user.userId)),db.select().from(items).where(eq(items.owner,user.userId)),db.select({shop:stores.shop,name:stores.name,connectedAt:stores.connectedAt}).from(stores).where(eq(stores.owner,user.userId))]);return Response.json({profile:p[0]?JSON.parse(p[0].payload):defaultProfile,items:i.map(x=>JSON.parse(x.payload)),capabilities:{ai:Boolean((env as unknown as Record<string,string>).OPENAI_API_KEY),shopify:shopifyConfig().configured},stores:connected,user:user.displayName},{headers});}catch{return Response.json({error:'Workspace storage is unavailable. Please try again.'},{status:503,headers});}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401,headers});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Request origin rejected.'},{status:403,headers});
 if(Number(req.headers.get('content-length'))>30000)return Response.json({error:'Request too large.'},{status:413,headers});
 try{const raw=await req.text();if(raw.length>30000)return Response.json({error:'Request too large.'},{status:413,headers});const body=JSON.parse(raw);const db=getDb();
 if(body.action==='profile'){const p=profileSchema.parse(body.value);await db.insert(profiles).values({owner:user.userId,payload:JSON.stringify(p)}).onConflictDoUpdate({target:profiles.owner,set:{payload:JSON.stringify(p)}});return Response.json({ok:true},{headers});}
 if(body.action==='item'){const item=itemSchema.parse(body.value);await db.insert(items).values({owner:user.userId,id:item.id,kind:item.kind,payload:JSON.stringify(item),updatedAt:new Date().toISOString()}).onConflictDoUpdate({target:[items.owner,items.id],set:{kind:item.kind,payload:JSON.stringify(item),updatedAt:new Date().toISOString()}});return Response.json({ok:true},{headers});}
 return Response.json({error:'Unknown operation.'},{status:400,headers});
 }catch{return Response.json({error:'Could not save. Check your input and try again.'},{status:400,headers});}
}
