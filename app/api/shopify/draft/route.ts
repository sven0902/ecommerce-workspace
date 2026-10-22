import {z} from 'zod';
import {and,eq} from 'drizzle-orm';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getDb} from '../../../../db';
import {executions,items} from '../../../../db/schema';
import {executionResultSchema} from '../../../../lib/execution-result';
import {createShopifyDraft} from '../../../../lib/shopify-draft';
import {shopifyGraphql} from '../../../../lib/shopify';
import {shopDomain} from '../../../../lib/shopify-security';
import {resultItemId} from '../../../../lib/execution-library';
export async function POST(req:Request){
 const headers={'Cache-Control':'private, no-store'};
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401,headers});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Request rejected.'},{status:403,headers});
 try{
  const raw=await req.text();if(raw.length>1000)throw new Error('Invalid request.');
  const input=z.object({taskId:z.string().uuid(),productId:z.string().max(100),shop:z.string().max(200)}).parse(JSON.parse(raw));
  const shop=shopDomain(input.shop),db=getDb();
  const task=(await db.select().from(executions).where(and(eq(executions.owner,user.userId),eq(executions.id,input.taskId))))[0];
  if(!task?.result)throw new Error('Research result is not available.');
  const product=executionResultSchema.parse(JSON.parse(task.result).result).products.find(p=>p.id===input.productId);
  if(!product?.shopifyDraft)throw new Error('This product has no prepared listing.');
  const saved=await createShopifyDraft((query,variables)=>shopifyGraphql(user.userId,shop,query,variables),task.id,product.id,product.shopifyDraft);
  const adminUrl=`https://${shop}/admin/products/${saved.product.id.split('/').pop()}`;
  const itemId=await resultItemId(task.id,'product',product.id),where=and(eq(items.owner,user.userId),eq(items.id,itemId));
  const item=(await db.select().from(items).where(where))[0];
  if(item){const value=JSON.parse(item.payload);await db.update(items).set({payload:JSON.stringify({...value,execution:{...value.execution,shopify:{id:saved.product.id,shop,adminUrl,status:saved.product.status,issues:saved.issues}}}),updatedAt:new Date().toISOString()}).where(where);}
  return Response.json({product:saved.product,adminUrl,reused:saved.reused,issues:saved.issues},{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Shopify import could not be verified.'},{status:400,headers});}
}
