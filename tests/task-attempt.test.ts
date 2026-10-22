import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attemptTurns,retryableFailure,failureMessage} from '../lib/task-attempt.ts';
test('only temporary terminal errors permit retry',()=>{
 assert.equal(retryableFailure({code:'server_overloaded'}),true);
 assert.equal(retryableFailure({code:'invalid_api_key'}),false);
 assert.equal(retryableFailure(undefined),false);
 assert.match(failureMessage({code:'server_overloaded'}),/temporarily/);
});
test('previous failed turns never terminate a new attempt',()=>{
 const previous={id:'failed1',status:'failed'},next={id:'new2',status:'running'};
 const input=JSON.stringify({_previousTurnIds:['failed1']});
 assert.deepEqual(attemptTurns([previous],input),[]);
 assert.deepEqual(attemptTurns([next,previous],input),[next]);
 assert.deepEqual(attemptTurns([previous],'{}'),[previous]);
});
