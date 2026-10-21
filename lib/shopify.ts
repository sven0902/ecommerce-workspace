import {env} from 'cloudflare:workers';
import {getDb} from '../db';
import {stores} from '../db/schema';
import {and,eq} from 'drizzle-orm';
import {seal,unseal,shopDomain} from './shopify-security';
export function shopifyConfig(){const e=env as unknown as Record<string,string>;return {clientId:e.SHOPIFY_CLIENT_ID,secret:e.SHOPIFY_CLIENT_SECRET,configured:!!(e.SHOPIFY_CLIENT_ID&&e.SHOPIFY_CLIENT_SECRET)}}
export async function shopifyGraphql(owner:string,shopInput:string,query:string,variables:Record<string,unknown>={}){
 const shop=shopDomain(shopInput),cfg=shopifyConfig();if(!cfg.configured)throw new Error('Shopify app setup is required.');const db=getDb();const row=(await db.select().from(stores).where(and(eq(stores.owner,owner),eq(stores.shop,shop))))[0];if(!row)throw new Error('Connect this store first.');
 let token=unseal(row.credentials,cfg.secret,owner+':'+shop);
 if(token.expiresAt&&Date.now()>token.expiresAt-60000){if(!token.refresh_token)throw new Error('Reconnect your Shopify store.');const r=await fetch(`https://${shop}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:cfg.clientId,client_secret:cfg.secret,grant_type:'refresh_token',refresh_token:token.refresh_token}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(r.status===401?'Reconnect your Shopify store.':'Shopify could not refresh access. Try again later.');const next=await r.json() as any;if(!next.access_token)throw new Error('Shopify returned an invalid token.');token={...next,expiresAt:next.expires_in?Date.now()+next.expires_in*1000:null};await db.update(stores).set({credentials:seal(token,cfg.secret,owner+':'+shop)}).where(and(eq(stores.owner,owner),eq(stores.shop,shop)));}
 const r=await fetch(`https://${shop}/admin/api/2026-04/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(r.status===401?'Reconnect your Shopify store.':'Shopify is unavailable. Try again later.');const d=await r.json() as any;if(d.errors)throw new Error('Shopify could not complete the request. Check the app permissions.');return d.data;
}
