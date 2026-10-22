import {z} from 'zod';
const url=z.string().url().refine(v=>{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;});
const money=z.string().regex(/^\d{1,8}(\.\d{1,2})?$/);
const label=z.string().trim().min(1).max(200);
export const listingSchema=z.object({
 title:label,descriptionHtml:z.string().min(1).max(15000),
 images:z.array(z.object({url,alt:z.string().max(500),sourceUrl:url})).max(20).default([]),
 currency:z.string().regex(/^[A-Z]{3}$/).optional(),
 options:z.array(z.object({name:label,values:z.array(label).min(1).max(100)})).max(3).default([]),
 variants:z.array(z.object({options:z.array(z.object({name:label,value:label})).min(1).max(3),price:money,sourceUrl:url,sku:z.string().max(100).optional()})).max(100).default([]),
}).superRefine((d,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 if(d.variants.length&&!d.currency)issue('Variant prices require an explicit currency.');
 if(d.options.length&&!d.variants.length)issue('Options require explicit variants; never invent combinations.');
 if(new Set(d.options.map(o=>o.name)).size!==d.options.length)issue('Duplicate option names.');
 for(const o of d.options)if(new Set(o.values).size!==o.values.length)issue('Duplicate option values.');
 const combinations=new Set<string>();
 for(const v of d.variants){
  if(v.options.length!==d.options.length||new Set(v.options.map(o=>o.name)).size!==v.options.length)issue('Each variant needs exactly one value per option.');
  for(const o of v.options)if(!d.options.some(p=>p.name===o.name&&p.values.includes(o.value)))issue('Variant value not declared in product options.');
  const key=JSON.stringify([...v.options].sort((a,b)=>a.name.localeCompare(b.name)));
  if(combinations.has(key))issue('Duplicate variant combination.');combinations.add(key);
 }
});
export type Listing=z.infer<typeof listingSchema>;
export function listingInput(d:Listing){
 return {
  ...(d.images.length?{files:d.images.map(i=>({originalSource:i.url,alt:i.alt,contentType:'IMAGE'}))}:{}),
  ...(d.variants.length?{productOptions:d.options.map((o,i)=>({name:o.name,position:i+1,values:o.values.map(name=>({name}))})),variants:d.variants.map(v=>({price:v.price,...(v.sku?{sku:v.sku}:{}),optionValues:v.options.map(o=>({optionName:o.name,name:o.value}))}))}:{}),
 };
}
/** Compare actual saved data; a successful mutation alone is insufficient. */
export function listingIssues(d:Listing,actual:any):string[]{
 const issues:string[]=[];
 if(!d.images.length)issues.push('No product images collected');
 if(!d.variants.length)issues.push('Variant pricing has not been prepared');
 if(d.variants.length){
  const variants=actual.variants?.nodes??[];
  if(variants.length!==d.variants.length)issues.push('Variant count differs');
  for(const wanted of d.variants){
   const found=variants.find((v:any)=>v.selectedOptions?.length===wanted.options.length&&wanted.options.every(o=>v.selectedOptions.some((x:any)=>x.name===o.name&&x.value===o.value)));
   if(!found)issues.push('Variant missing: '+wanted.options.map(o=>o.value).join(' / '));
   else if(Number(found.price)!==Number(wanted.price)||(wanted.sku!==undefined&&found.sku!==wanted.sku))issues.push('Variant price or SKU differs');
  }
 }
 if(d.images.length){
  const media=actual.media?.nodes??[];
  if(media.length!==d.images.length)issues.push('Image count differs');
  if(media.some((m:any)=>m.status!=='READY'||!m.image?.url))issues.push('Images are still processing or failed');
 }
 return issues;
}
