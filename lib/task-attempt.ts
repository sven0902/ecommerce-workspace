import {z} from 'zod';
const errorSchema=z.object({code:z.string()});
export function retryableFailure(error:unknown){const p=errorSchema.safeParse(error);return p.success&&['server_overloaded','rate_limit_exceeded','internal_server_error'].includes(p.data.code);}
export function failureMessage(error:unknown){return retryableFailure(error)?'The execution service is temporarily unavailable. Retry this task without creating a duplicate.':'Execution did not complete. Existing outputs have been preserved.';}
export function attemptTurns<T extends {id:string}>(turns:T[],input:string){
 const parsed=JSON.parse(input);const excluded=z.array(z.string()).safeParse(parsed._previousTurnIds);
 return turns.filter(t=>!excluded.success||!excluded.data.includes(t.id));
}
