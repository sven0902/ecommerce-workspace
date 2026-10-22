import {z} from 'zod';
import {resultItemId} from './execution-library.ts';
import {listingSchema,listingInput,listingIssues} from './shopify-listing.ts';
export const draftSchema=listingSchema;
type Graphql=(query:string,variables:Record<string,unknown>)=>Promise<any>;
const productSchema=z.object({id:z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/),handle:z.string(),title:z.string(),status:z.string(),tags:z.array(z.string()),variants:z.object({nodes:z.array(z.any())}).optional(),media:z.object({nodes:z.array(z.any())}).optional()});
const lookup=`query WorkspaceDraft($query:String!){products(first:2,query:$query){nodes{id handle title status tags variants(first:100){nodes{price sku selectedOptions{name value}}} media(first:20){nodes{status ... on MediaImage{image{url}}}}}}}`;
const mutation=`mutation WorkspaceDraft($input:ProductSetInput!,$identifier:ProductSetIdentifiers!){productSet(input:$input,identifier:$identifier,synchronous:true){product{id handle title status tags} userErrors{field message}}}`;
export function safeDescription(html:string){
 const text=html.replace(/<\/(?:p|li|div)>/gi,'\n').replace(/<[^>]*>/g,'');
 return text.split('\n').filter(s=>s.trim()).map(s=>'<p>'+s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')+'</p>').join('');
}
export async function createShopifyDraft(graphql:Graphql,taskId:string,productId:string,draft:unknown){
 const parsed=draftSchema.parse(draft),key=(await resultItemId(taskId,'shopify',productId)).replace(/-/g,'');
 const handle='workspace-'+key,tag='workspace-task:'+key;
 const find=async()=>{
  const data=await graphql(lookup,{query:`handle:${handle}`});
  const nodes=z.object({products:z.object({nodes:z.array(productSchema)})}).parse(data).products.nodes;
  const exact=nodes.find(p=>p.handle===handle);
  if(exact&&!exact.tags.includes(tag))throw new Error('Existing product does not belong to this import.');
  return exact;
 };
 const existing=await find();if(existing)return {product:existing,reused:true,issues:listingIssues(parsed,existing)};
 if(parsed.variants.length){
  const shop=await graphql('query WorkspaceCurrency{shop{currencyCode}}',{});
  if(shop?.shop?.currencyCode!==parsed.currency)throw new Error('Listing currency does not match the store. Set prices in the store currency first.');
 }
 const data=await graphql(mutation,{identifier:{handle},input:{handle,title:parsed.title,descriptionHtml:safeDescription(parsed.descriptionHtml),status:'DRAFT',tags:[tag],...listingInput(parsed)}});
 const response=z.object({productSet:z.object({product:productSchema.nullable(),userErrors:z.array(z.object({message:z.string()}))})}).parse(data).productSet;
 if(response.userErrors.length)throw new Error(response.userErrors.map(e=>e.message).join('; '));
 const actual=await find();
 if(!actual||actual.id!==response.product?.id||actual.status!=='DRAFT')throw new Error('Shopify saved state could not be verified.');
 return {product:actual,reused:false,issues:listingIssues(parsed,actual)};
}
