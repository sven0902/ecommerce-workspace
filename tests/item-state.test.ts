import {test} from 'node:test';
import assert from 'node:assert/strict';
import {itemFlags,matchesState,stateLabel,statePatchSchema} from '../lib/item-state.ts';
test('legacy test states retain their meaning until explicitly unchecked',()=>{
 assert.equal(itemFlags({status:'testing'}).testing,true);
 assert.equal(itemFlags({status:'testing',testing:false}).testing,false);
 assert.equal(matchesState({status:'testing',testing:false},'review'),true);
});
test('testing and tested are independent; dismissing preserves both',()=>{
 const item={status:'review',testing:true,tested:true};
 assert.equal(matchesState(item,'testing'),true);assert.equal(matchesState(item,'tested'),true);
 assert.equal(stateLabel(item),'Testing · Tested');
 assert.equal(matchesState({...item,dismissed:true},'all'),false);
 assert.equal(matchesState({...item,dismissed:true},'testing'),false);
 assert.equal(matchesState({...item,dismissed:false},'tested'),true);
});
test('state patch cannot replace copy, execution authority or another field',()=>{
 const p={id:'11111111-2222-4333-8444-555555555555',field:'testing',value:true};
 assert.equal(statePatchSchema.safeParse(p).success,true);
 assert.equal(statePatchSchema.safeParse({...p,body:'replace copy'}).success,false);
 assert.equal(statePatchSchema.safeParse({...p,field:'execution'}).success,false);
});
