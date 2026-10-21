'use client';
import {Package,Film,ShoppingBag,FileText,ArrowDown,Check} from 'lucide-react';

export function WorkspaceMark(){return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 7C18 7 11 18 16 27L32 55C46 55 53 44 48 35L32 7Z" stroke="currentColor" strokeWidth="5"/><path d="M7 32C7 46 18 53 27 48L55 32C55 18 44 11 35 16L7 32Z" stroke="currentColor" strokeWidth="5"/></svg>}
const nodes=[
 {id:'products',title:'Find Products',detail:'We research products and competitors.',Icon:Package,prompt:'Find products',text:'Find five products for my niche and prepare a plan for testing them: '},
 {id:'videos',title:'Ad Spy & Research',detail:'We find ads worth testing.',Icon:Film,prompt:'Find video ads',text:'Find video ad references for this product: '},
 {id:'shopify',title:'Build Shopify Pages',detail:'We build your product pages.',Icon:ShoppingBag,prompt:'Prepare a product page',text:'Prepare a Shopify product page for this product: '},
 {id:'copy',title:'Write Creatives',detail:'The right words for your audience.',Icon:FileText,prompt:'Write ad copy',text:'Write targeted primary texts and headlines for this product: '}
];
export default function WorkflowGraphic({onAction}:{onAction:(title:string,text:string)=>void}){
 return <div className="workflow-visual" aria-label="One assistant connects product research, video ads, Shopify product pages and ad copy into one test package.">
  <div className="workflow-halo" aria-hidden="true"/>
  <svg className="workflow-wires" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="wire-glow"><stop stopColor="#919aff" stopOpacity=".1"/><stop offset=".5" stopColor="#d4caff"/><stop offset="1" stopColor="#919aff" stopOpacity=".1"/></linearGradient></defs>{['M210 65 H270 Q300 65 300 95 V120 Q300 145 330 145 H400','M210 225 H270 Q300 225 300 195 V170 Q300 145 330 145 H400','M590 65 H530 Q500 65 500 95 V120 Q500 145 470 145 H400','M590 225 H530 Q500 225 500 195 V170 Q500 145 470 145 H400'].map((path,i)=><g key={path}><path d={path} className="wire-base"/><path d={path} className="wire-flow" style={{animationDelay:`${i*1.3}s`}}/><circle r="3" fill="#d7d8ff" className="wire-particle"><animateMotion path={path} dur="5.2s" begin={`${i*1.3}s`} repeatCount="indefinite"/></circle></g>)}</svg>
  <div className="workflow-core"><div className="core-orbit"/><div className="core-logo"><WorkspaceMark/></div></div>
  {nodes.map(({id,title,detail,Icon,prompt,text},i)=><button key={id} className={`workflow-node node-${id}`} style={{animationDelay:`${i*1.3}s`}} onClick={()=>onAction(prompt,text)}><span className="node-icon">{id==='shopify'?<img src="/brands/shopify.svg" alt=""/>:<Icon size={26}/>}</span><span className="node-copy-block"><strong>{title}</strong><small>{detail}</small></span></button>)}
  <div className="launch-result"><div className="launch-line" aria-hidden="true"/><div className="launch-card"><div className="launch-message"><span className="launch-check"><Check size={19}/></span><h2>You just launch.</h2></div><div className="launch-platforms">{['meta','pinterest','tiktok'].map(platform=><a key={platform} href={{meta:'https://adsmanager.facebook.com/',pinterest:'https://ads.pinterest.com/',tiktok:'https://ads.tiktok.com/'}[platform]} target="_blank" rel="noreferrer" aria-label={`Open ${platform} Ads Manager`}><img src={`/brands/${platform}.svg`} alt=""/><span>{platform==='tiktok'?'TikTok':platform[0].toUpperCase()+platform.slice(1)}</span></a>)}</div></div></div>
 </div>
}
