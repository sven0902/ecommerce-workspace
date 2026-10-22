import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {verifySessionEvent} from '../lib/webhook-event.ts';
const key=randomBytes(32),secret='whsec_'+key.toString('base64');
const body=JSON.stringify({id:'evt_test',type:'agent.session.idle',data:{id:'sess_test'}});
function headers(payload:string,stamp=Math.floor(Date.now()/1000)){
 const id='msg_test',sig=createHmac('sha256',key).update(`${id}.${stamp}.${payload}`).digest('base64');
 return new Headers({'webhook-id':id,'webhook-timestamp':String(stamp),'webhook-signature':'v1,'+sig});
}
test('signed current session event accepted',async()=>{assert.equal((await verifySessionEvent(body,headers(body),secret))?.data.id,'sess_test');});
test('tampered or expired events cannot update tasks',async()=>{
 await assert.rejects(verifySessionEvent(body+' ',headers(body),secret));
 await assert.rejects(verifySessionEvent(body,headers(body,1),secret));
 await assert.rejects(verifySessionEvent(body,new Headers(),secret));
});
test('unsigned owner and result payload cannot confer authority',async()=>{
 const modified=JSON.stringify({id:'evt_test',type:'agent.session.idle',data:{id:'sess_test',owner:'victim',result:'fake'}});
 const result=await verifySessionEvent(modified,headers(modified),secret);
 assert.deepEqual(result?.data,{id:'sess_test'});
});
