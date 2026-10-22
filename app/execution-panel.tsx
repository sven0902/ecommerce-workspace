'use client';
import {useEffect,useState,useRef} from 'react';
type Task={approvals?:{request_id:string;request:{origin:string;reason?:string|null}}[];id:string;title?:string;status:string;error?:string;createdAt:string;result?:{result:{summary:string;blockers:string[];products:{id:string;title:string;sourceUrl:string}[];creatives:{id:string;audience:string;angle:string;primaryText:string;headline:string;sourceUrl:string}[]};artifacts:{id:string;path:string;size_bytes:number}[]}};
export default function ExecutionPanel({refresh,onCompleted}:{refresh:number;onCompleted:()=>void}){
 const [tasks,setTasks]=useState<Task[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 async function retry(taskId:string){
  try{const r=await fetch('/api/tasks/retry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId})});const d=await r.json() as {error?:string};if(!r.ok)throw new Error(d.error);setTasks(old=>old.map(t=>t.id===taskId?{...t,status:'submitting',error:undefined}:t));setError('');}catch(e){setError(e instanceof Error?e.message:'Retry failed.');}
 }
 async function recover(taskId:string){
  try{const r=await fetch('/api/tasks/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId})});const d=await r.json() as {error?:string};if(!r.ok)throw new Error(d.error);setError('');}catch(e){setError(e instanceof Error?e.message:'Recovery failed.');}
 }
 async function decide(taskId:string,requestId:string,decision:'approve'|'deny'){
  try{const r=await fetch('/api/tasks/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId,requestId,decision})});if(!r.ok)throw new Error();setTasks(old=>old.map(t=>t.id===taskId?{...t,approvals:t.approvals?.filter(a=>a.request_id!==requestId)}:t));setError('');}catch{setError('Could not confirm website access. Refresh the task before retrying.');}
 }
 const seen=useRef(new Set<string>()),completed=useRef(onCompleted);completed.current=onCompleted;
 useEffect(()=>{
  let stopped=false;let timer:ReturnType<typeof setTimeout>;
  async function poll(){
   try{
    const response=await fetch('/api/tasks',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Could not load tasks.');
    const data=await response.json() as {tasks:Task[]};
    // Show durable records before waiting for remote agent status.
    if(stopped)return;
    setTasks([...data.tasks].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));setLoading(false);
    const updated:Task[]=[];let statusUnavailable=false;
    for(const task of data.tasks){
     if(['starting','submitting','running','needs_input','verifying'].includes(task.status)){
      try{
       const r=await fetch('/api/tasks?id='+encodeURIComponent(task.id),{signal:AbortSignal.timeout(20000)});
       if(!r.ok)throw new Error('Status unavailable');
       const fresh=(await r.json() as {task:Task}).task;updated.push(fresh);
       if(!stopped)setTasks(old=>old.map(t=>t.id===fresh.id?fresh:t));
      }catch{updated.push(task);statusUnavailable=true;}
      if(stopped)return;
     }else updated.push(task);
    }
    if(!stopped){
     const newlyCompleted=updated.filter(t=>t.status==='review'&&!seen.current.has(t.id));
     for(const task of newlyCompleted)seen.current.add(task.id);
     setTasks(updated.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));setError(statusUnavailable?'Showing saved tasks. Live status is temporarily unavailable; it will retry automatically.':'');
     if(newlyCompleted.length)completed.current();
    }
   }catch{if(!stopped){setLoading(false);setError('Could not refresh tasks. Your work has not been restarted.');}}
   if(!stopped)timer=setTimeout(poll,10000);
  }
  void poll();return()=>{stopped=true;clearTimeout(timer);};
 },[refresh]);
 if(loading&&!tasks.length)return <section className="conversation" aria-label="Executing tasks"><p role="status">Loading your tasks…</p></section>;
 if(!tasks.length&&!error)return null;
 return <section className="conversation" aria-label="Executing tasks"><h2>Your tasks</h2>{error&&<p role="status">{error}</p>}{tasks.map(task=><article key={task.id}>
  <div className="card-top"><strong>{task.title||'Preparing your products and ads'}</strong><span className="pill">{task.status==='review'?(task.result?.result.blockers.length?'Partial result':'Ready for review'):task.status.replace('_',' ')}</span></div>
  {task.result&&<p>{task.result.result.summary}</p>}
  {task.error&&<p role="status">{task.error}</p>}{task.status==='failed'&&<button onClick={()=>retry(task.id)}>Retry existing task</button>}{['starting','submitting'].includes(task.status)&&<button onClick={()=>recover(task.id)}>Recover existing task</button>}
  {task.approvals?.map(a=><div key={a.request_id} className="card"><strong>Allow website access?</strong><p>{a.request.origin}</p><p>{a.request.reason}</p><div className="actions"><button onClick={()=>decide(task.id,a.request_id,'approve')}>Allow</button><button onClick={()=>decide(task.id,a.request_id,'deny')}>Deny</button></div></div>)}
  {['starting','submitting','running'].includes(task.status)&&<p>Working in the background. You can leave this page and return later.</p>}
  {task.result?.result.products.map(p=><p key={p.id}><a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.title} ↗</a></p>)}
  {task.result?.result.creatives.map(c=><div className="card" key={c.id}><h3>{c.angle}</h3><small>{c.audience}</small><p>{c.primaryText}</p><strong>{c.headline}</strong><div className="actions"><button onClick={()=>navigator.clipboard.writeText(c.primaryText+'\n\n'+c.headline)}>Copy text</button><a href={c.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a></div></div>)}
  {task.result?.artifacts.filter(a=>!a.path.includes('/evidence/')&&!a.path.endsWith('/result.json')).map(a=><div className="actions" key={a.id}><a href={`/api/tasks/download?task=${encodeURIComponent(task.id)}&artifact=${encodeURIComponent(a.id)}`}>Download {a.path.split('/').pop()} · {Math.ceil(a.size_bytes/1024)} KB</a></div>)}
  {!!task.result?.result.blockers.length&&<details><summary>What still needs attention</summary>{task.result.result.blockers.map((b,n)=><p key={n}>{b}</p>)}</details>}
 </article>)}</section>;
}
