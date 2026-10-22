import {and,eq} from 'drizzle-orm';
import {getDb} from '../db';
import {executions,items} from '../db/schema';
import {libraryItems} from './execution-library';
import {AgentClient,originApprovals} from './agent-client';
import {AgentArtifacts} from './agent-artifacts';
import {attemptTurns,failureMessage} from './task-attempt';
export async function reconcileTask(row:typeof executions.$inferSelect,key:string){
 if(!row.sessionId||['review','failed','cancelled'].includes(row.status))return {row,approvals:[]};
 const db=getDb(),where=and(eq(executions.owner,row.owner),eq(executions.id,row.id),eq(executions.submissionKey,row.submissionKey));
 const current=await new AgentClient(key).inspect(row.sessionId);
 const turns=attemptTurns(current.turns,row.input),turn=row.turnId?turns.find(t=>t.id===row.turnId):turns[0];
 let status=row.status,result=row.result,error:string|null=null;
 if(turn?.status==='completed'){
  try{
   const output=await new AgentArtifacts(key).result(row.sessionId,turn.id);
   const entries=await libraryItems(row.id,output.result,output.artifacts,turn.id,row.createdAt);
   if(entries.length)await db.insert(items).values(entries.map(item=>({owner:row.owner,id:item.id,kind:item.kind,payload:JSON.stringify(item),updatedAt:new Date().toISOString()}))).onConflictDoNothing();
   result=JSON.stringify(output);status='review';
  }catch{status='verifying';error='Execution ended. Its output package is not yet verified; downloads will appear once checked.';}
 }else if(turn&&['failed','cancelled'].includes(turn.status)){status=turn.status;error=failureMessage(turn.error);}
 else if(current.session.status==='failed'){status='failed';error='The execution environment failed.';}
 else if(current.session.required_actions.length){status='needs_input';error='This task requires additional access or input.';}
 else if(turn){status='running';}
 const updated={status,result,error,turnId:turn?.id??row.turnId,updatedAt:new Date().toISOString()};
 const saved=await db.update(executions).set(updated).where(where).returning();
 return {row:saved[0]??row,approvals:originApprovals(current.session.required_actions)};
}
