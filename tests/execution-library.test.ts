import {test} from 'node:test';
import assert from 'node:assert/strict';
import {libraryItems,resultItemId} from '../lib/execution-library.ts';
import {itemSchema} from '../lib/workspace.ts';
import type {ExecutionResult} from '../lib/execution-result.ts';
const result:ExecutionResult={adCopy:[],version:1,summary:'Research completed',products:[{id:'p1',title:'Balloon jogger',sourceUrl:'https://example.com/product',verifiedFeatures:[]}],creatives:[{id:'c1',productId:'p1',sourceUrl:'https://example.com/video',competitorProductUrl:'https://example.com/product',productMatch:'verified',mediaPath:'/workspace/outputs/video.mp4',reach:null,startedAt:null,audience:'Polish women',angle:'Everyday comfort',primaryText:'Swoboda na co dzień.',headline:'Wygodny fason',sha256:'a'.repeat(64)}],blockers:[]};
test('reconciliation produces stable valid library IDs and keeps assets in review',async()=>{
 const date='2026-10-22T03:00:00.000Z';
 const first=await libraryItems('task1',result,[],'turn1',date);
 const retry=await libraryItems('task1',result,[],'turn1',date);
 assert.deepEqual(first,retry);
 for(const item of first){assert.equal(itemSchema.safeParse(item).success,true);assert.equal(item.status,'review');}
 assert.notEqual(await resultItemId('task2','product','p1'),first[0].id);
 assert.notEqual(first[0].id,first[1].id);
});
test('download metadata only binds files from the completed turn',async()=>{
 const artifacts=[{id:'a1',turn_id:'old-turn',path:'/workspace/outputs/video.mp4',size_bytes:1000}];
 const old=await libraryItems('task1',result,artifacts,'turn1','2026-10-22T03:00:00.000Z');
 assert.equal(old[1].execution?.artifactId,undefined);
 const current=await libraryItems('task1',result,[{...artifacts[0],turn_id:'turn1'}],'turn1','2026-10-22T03:00:00.000Z');
 assert.equal(current[1].execution?.artifactId,'a1');
});
