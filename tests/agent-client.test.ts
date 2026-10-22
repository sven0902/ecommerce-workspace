import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AgentClient,originApprovals} from '../lib/agent-client.ts';
test('submission retries preserve the same idempotency key and payload',async()=>{
 const calls:{url:string;init:RequestInit|undefined}[]=[];
 const request=(async(url,init)=>{calls.push({url:String(url),init});return Response.json({ok:true});}) as typeof fetch;
 const client=new AgentClient('test-key',request);
 await client.submit('sess_test','Research this product','persisted-message-id');
 await client.submit('sess_test','Research this product','persisted-message-id');
 assert.equal(calls[0].init?.body,calls[1].init?.body);
 assert.equal(new Headers(calls[0].init?.headers).get('Idempotency-Key'),'persisted-message-id');
 assert.equal(calls[0].url,'https://api.openai.com/v1/agents/sessions/sess_test/events');
});
test('untrusted session paths never become API destinations',async()=>{
 const client=new AgentClient('test-key',async()=>{throw new Error('Must not fetch');});
 await assert.rejects(client.inspect('../other-session'));
});
test('idle session does not erase failed turn evidence',async()=>{
 const request=(async(url)=>Response.json(String(url).includes('/turns?')?{data:[{id:'turn1',status:'failed',subagent_id:null}]}:{id:'sess_test',status:'idle',required_actions:[]})) as typeof fetch;
 const result=await new AgentClient('test-key',request).inspect('sess_test');
 assert.equal(result.turns[0].status,'failed');
});
test('accepted events may return 204 without JSON',async()=>{
 const client=new AgentClient('test-key',async()=>new Response(null,{status:204}));
 assert.equal(await client.submit('sess_test','Hello','submission1'),null);
});
test('only pending origin approvals can be answered',async()=>{
 const calls:string[]=[];
 const request=(async(url)=>{calls.push(String(url));return Response.json(String(url).includes('/turns?')?{data:[]}:{id:'sess_test',status:'idle',required_actions:[]});}) as typeof fetch;
 await assert.rejects(new AgentClient('test-key',request).approveOrigin('sess_test','stale-request','approve'));
 assert.equal(calls.some(url=>url.endsWith('/events')),false);
 assert.deepEqual(originApprovals([{type:'computer_use_approval_request',request_id:'auth',request:{type:'browser_authentication',fields:[{secret:'must not surface'}]}}]),[]);
});
