import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessCreative,executionResultSchema} from '../lib/execution-result.ts';
const hash='a'.repeat(64);
const product={id:'p',title:'Jogger',sourceUrl:'https://example.com/product',verifiedFeatures:[]};
const creative={id:'c',productId:'p',sourceUrl:'https://example.com/ad',competitorProductUrl:product.sourceUrl,productMatch:'verified' as const,mediaPath:'/workspace/outputs/ad.mp4',sha256:hash,reach:null,startedAt:null,audience:'Women seeking relaxed fit',angle:'Comfort',primaryText:'A relaxed fit for everyday wear.',headline:'Room to move'};
const artifact={id:'artifact1',turn_id:'turn1',path:creative.mediaPath,size_bytes:1024};
test('a claimed completed ad without a file stays review',()=>{
 assert.equal(assessCreative(creative,[product],[],'turn1',[]).status,'review');
});
test('an artifact from an older turn cannot qualify this output',()=>{
 assert.equal(assessCreative(creative,[product],[artifact],'turn2',[{artifactId:artifact.id,sha256:hash,decodable:true}]).status,'review');
});
test('decoded bytes, checksum and product match are all required',()=>{
 const checks=[{artifactId:artifact.id,sha256:hash,decodable:true}];
 assert.equal(assessCreative(creative,[product],[artifact],'turn1',checks).status,'ready');
 assert.equal(assessCreative({...creative,productMatch:'uncertain'},[product],[artifact],'turn1',checks).status,'review');
 assert.equal(assessCreative(creative,[],[artifact],'turn1',checks).status,'review');
 assert.equal(assessCreative(creative,[product],[artifact],'turn1',[{...checks[0],sha256:'b'.repeat(64)}]).status,'review');
});
test('unknown reach is allowed but a number without scope is rejected',()=>{
 const data={version:1,summary:'Done',products:[product],creatives:[creative],blockers:[]};
 assert.equal(executionResultSchema.safeParse(data).success,true);
 assert.equal(executionResultSchema.safeParse({...data,creatives:[{...creative,reach:{value:1000}}]}).success,false);
 assert.equal(executionResultSchema.safeParse({...data,creatives:[{...creative,mediaPath:'/workspace/outputs/../secret'}]}).success,false);
});
