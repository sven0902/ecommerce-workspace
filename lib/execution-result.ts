import {z} from 'zod';
import {listingSchema} from './shopify-listing.ts';

const httpsUrl=z.string().url().refine(v=>new URL(v).protocol==='https:');
const outputPath=z.string().regex(/^\/workspace\/outputs\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/).refine(v=>!v.split('/').includes('..'));
export const executionResultSchema=z.object({
  version:z.literal(1),
  summary:z.string().min(1).max(4000),
  products:z.array(z.object({
    id:z.string().min(1).max(100),title:z.string().min(1),sourceUrl:httpsUrl,
    verifiedFeatures:z.array(z.object({text:z.string().min(1),sourceUrl:httpsUrl})),
    shopifyDraft:listingSchema.optional(),
  })).max(5),
  creatives:z.array(z.object({
    id:z.string().min(1).max(100),productId:z.string(),sourceUrl:httpsUrl,
    competitorProductUrl:httpsUrl,productMatch:z.enum(['verified','uncertain']),
    mediaPath:outputPath.optional(),sha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),
    reach:z.object({value:z.number().int().nonnegative(),scope:z.string().min(1),checkedAt:z.string().datetime(),sourceUrl:httpsUrl}).nullable(),
    startedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    audience:z.string().min(1),angle:z.string().min(1),primaryText:z.string().min(1),headline:z.string().min(1),
  })).max(30),
  adCopy:z.array(z.object({id:z.string().min(1).max(100),productId:z.string(),audience:z.string().min(1),angle:z.string().min(1),primaryText:z.string().min(1),headline:z.string().min(1)})).max(30).default([]),
  blockers:z.array(z.string()).max(30),
});
export type ExecutionResult=z.infer<typeof executionResultSchema>;
export type PublishedArtifact={id:string;turn_id:string;path:string;size_bytes:number};

/** Only the application verifier can attest that downloaded media was decoded. */
export type MediaVerification={artifactId:string;sha256:string;decodable:boolean};
export function assessCreative(
  creative:ExecutionResult['creatives'][number],products:ExecutionResult['products'],
  artifacts:PublishedArtifact[],turnId:string,checks:MediaVerification[],
){
  const issues:string[]=[];
  if(!products.some(p=>p.id===creative.productId))issues.push('Product missing');
  if(creative.productMatch!=='verified')issues.push('Product match needs review');
  const artifact=artifacts.find(a=>a.turn_id===turnId&&a.path===creative.mediaPath&&a.size_bytes>0);
  if(!artifact)issues.push('No published media file');
  const check=artifact&&checks.find(c=>c.artifactId===artifact.id);
  if(!check?.decodable)issues.push('Media playback not verified');
  if(!creative.sha256||check?.sha256!==creative.sha256)issues.push('Media checksum not verified');
  return {status:issues.length?'review' as const:'ready' as const,issues,artifactId:artifact?.id};
}
