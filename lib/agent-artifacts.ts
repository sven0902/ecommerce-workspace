import {z} from 'zod';
import {executionResultSchema} from './execution-result.ts';

const artifactSchema=z.object({id:z.string(),turn_id:z.string(),path:z.string(),size_bytes:z.number().int().nonnegative()});
const pageSchema=z.object({data:z.array(artifactSchema),has_more:z.boolean(),last_id:z.string().nullable()});
const identifier=z.string().regex(/^[a-zA-Z0-9_-]+$/);

/** Server-only client. Callers must resolve session IDs from owner-scoped storage. */
export class AgentArtifacts {
  constructor(private key:string,private request:typeof fetch=fetch){}
  private async get(path:string){
    const response=await this.request(`https://api.openai.com/v1/agents/sessions/${path}`,{
      headers:{Authorization:`Bearer ${this.key}`,'OpenAI-Beta':'agents=v1'},
      signal:AbortSignal.timeout(30000),
    });
    if(!response.ok)throw new Error(`Artifact service returned ${response.status}`);
    return response;
  }
  async list(sessionId:string,turnId:string){
    identifier.parse(sessionId);identifier.parse(turnId);
    const artifacts:z.infer<typeof artifactSchema>[]=[];
    const cursors=new Set<string>();let cursor:string|undefined;
    for(let page=0;page<20;page++){
      const suffix=cursor?`?after=${encodeURIComponent(cursor)}`:'';
      const result=pageSchema.parse(await (await this.get(`${sessionId}/artifacts${suffix}`)).json());
      artifacts.push(...result.data.filter(a=>a.turn_id===turnId));
      if(!result.has_more)return artifacts;
      if(!result.last_id||cursors.has(result.last_id))throw new Error('Invalid artifact pagination');
      cursor=result.last_id;cursors.add(cursor);
    }
    throw new Error('Artifact list exceeds limit');
  }
  async content(sessionId:string,artifactId:string){
    identifier.parse(sessionId);identifier.parse(artifactId);
    return this.get(`${sessionId}/artifacts/${artifactId}/content`);
  }
  async result(sessionId:string,turnId:string){
    const artifacts=await this.list(sessionId,turnId);
    const manifest=artifacts.find(a=>a.path==='/workspace/outputs/result.json');
    if(!manifest)throw new Error('The agent has not published a result manifest');
    if(manifest.size_bytes>256000)throw new Error('Result manifest is too large');
    const response=await this.content(sessionId,manifest.id);
    const reader=response.body?.getReader();if(!reader)throw new Error('Empty result response');
    const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>256000)throw new Error('Result manifest is too large');chunks.push(next.value);}}
    finally{await reader.cancel();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return {result:executionResultSchema.parse(JSON.parse(new TextDecoder().decode(bytes))),artifacts};
  }
}
