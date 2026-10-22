'use client';
import {useId,useRef,useState} from 'react';
import type {Item} from '../lib/workspace';
export default function CreativeContent({item}:{item:Item}){
 const id=useId(),video=useRef<HTMLVideoElement>(null);
 const [tab,setTab]=useState(0),[copied,setCopied]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(false);
 const data=item.execution;
 const tabs=data?.primaryText?[{label:'Primary text',text:data.primaryText},{label:'Headline',text:data.headline??''},{label:'Audience',text:data.audience??''}]:[{label:'Text',text:item.body}];
 const file=data?.artifactId?`/api/tasks/download?task=${encodeURIComponent(data.taskId)}&artifact=${encodeURIComponent(data.artifactId)}`:null;
 async function copy(){try{await navigator.clipboard.writeText(tabs[tab].text);setCopied(true);setError('');}catch{setError('Select the text to copy it manually.');}}
 return <div className="creative-content">
  {file&&<div className="creative-preview">{preview?<video ref={video} src={file+'&preview=1'} controls muted playsInline preload="metadata" onLoadedMetadata={()=>{if(video.current)video.current.muted=true;}} onError={()=>setError('Preview unavailable. Try downloading the original video.')} aria-label={'Video preview: '+item.title}/>:<button className="secondary" onClick={()=>setPreview(true)}>Preview video · starts muted</button>}</div>}
  {data&&<div className="creative-facts"><span>{data.reach?`${data.reach.value.toLocaleString()} reach · ${data.reach.scope}`:'Reach unknown'}</span><span>{data.startedAt?'Started '+data.startedAt:'Start date unknown'}</span>{data.reach&&<a href={data.reach.sourceUrl} target="_blank" rel="noreferrer">Checked {data.reach.checkedAt.slice(0,10)} ↗</a>}</div>}
  <div className="copy-tabs" role="tablist" aria-label="Ad copy">{tabs.map((t,n)=><button key={t.label} type="button" role="tab" id={`${id}-tab-${n}`} aria-controls={`${id}-panel`} aria-selected={tab===n} tabIndex={tab===n?0:-1} onClick={()=>{setTab(n);setCopied(false);}} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(n+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;setTab(next);setCopied(false);document.getElementById(`${id}-tab-${next}`)?.focus();}}}>{t.label}</button>)}</div>
  <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} tabIndex={0} className="copy-panel">{tabs[tab].text||'Not provided'}</div>
  <div className="actions"><button onClick={copy}>{copied?'Copied ✓':'Copy '+tabs[tab].label.toLowerCase()}</button>{item.sources?.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">Original ad ↗</a>)}</div>
  {error&&<p role="status">{error}</p>}
 </div>;
}
