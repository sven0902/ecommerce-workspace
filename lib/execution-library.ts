import type {ExecutionResult,PublishedArtifact} from './execution-result.ts';
import type {Item} from './workspace.ts';

// Stable identifiers make repeated reconciliation safe. Existing items are never
// overwritten: library copy and test states belong to the user.
export async function resultItemId(taskId:string,kind:string,sourceId:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([taskId,kind,sourceId])));
 const hex=Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export async function libraryItems(taskId:string,result:ExecutionResult,artifacts:PublishedArtifact[],turnId:string,createdAt:string):Promise<Item[]>{
 const products=await Promise.all(result.products.map(async p=>({
  id:await resultItemId(taskId,'product',p.id),kind:'product' as const,title:p.title.slice(0,200),
  body:(p.shopifyDraft?.descriptionHtml??p.verifiedFeatures.map(f=>f.text).join('\n')).slice(0,15000),
  url:p.sourceUrl,status:'review' as const,createdAt,
  sources:p.verifiedFeatures.map(f=>({title:f.text,url:f.sourceUrl})),
  execution:{taskId,sourceId:p.id},
 })));
 const creatives=await Promise.all(result.creatives.map(async c=>{
  const artifact=artifacts.find(a=>a.turn_id===turnId&&a.path===c.mediaPath&&a.size_bytes>0);
  return {id:await resultItemId(taskId,'creative',c.id),kind:'creative' as const,
   title:c.angle.slice(0,200),body:`${c.primaryText}\n\n${c.headline}`.slice(0,15000),url:c.competitorProductUrl,
   status:'review' as const,createdAt,sources:[{title:'Original creative',url:c.sourceUrl}],
   execution:{taskId,sourceId:c.id,artifactId:artifact?.id,productId:c.productId,audience:c.audience,primaryText:c.primaryText,headline:c.headline,reach:c.reach,startedAt:c.startedAt},
  };
 }));
 const copy=await Promise.all(result.adCopy.map(async c=>({
  id:await resultItemId(taskId,'copy',c.id),kind:'creative' as const,title:c.angle.slice(0,200),
  body:`${c.primaryText}\n\n${c.headline}`.slice(0,15000),url:result.products.find(p=>p.id===c.productId)?.sourceUrl??'',status:'review' as const,createdAt,
  execution:{taskId,sourceId:c.id,productId:c.productId,audience:c.audience,primaryText:c.primaryText,headline:c.headline},
 })));
 return [...products,...creatives,...copy];
}
