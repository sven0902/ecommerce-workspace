import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createShopifyDraft,safeDescription} from '../lib/shopify-draft.ts';
test('draft creation reads back Shopify and reuses an existing import',async()=>{
 let saved:any=null,writes=0;
 const gql=async(query:string,variables:Record<string,any>)=>{
  if(query.startsWith('query'))return {products:{nodes:saved?[saved]:[]}};
  writes++;saved={...variables.input,id:'gid://shopify/Product/123'};
  return {productSet:{product:saved,userErrors:[]}};
 };
 const draft={title:'Joggers',descriptionHtml:'<p>Roomy fit.</p>'};
 assert.equal((await createShopifyDraft(gql,'task','p',draft)).product.status,'DRAFT');
 assert.equal((await createShopifyDraft(gql,'task','p',draft)).reused,true);
 assert.equal(writes,1);
});
test('failed readback never becomes a verified import',async()=>{
 const gql=async(query:string,variables:Record<string,any>)=>query.startsWith('query')?{products:{nodes:[]}}:{productSet:{product:{...variables.input,id:'gid://shopify/Product/123'},userErrors:[]}};
 await assert.rejects(createShopifyDraft(gql,'task','p',{title:'Joggers',descriptionHtml:'Details'}),/verified/);
});
test('existing unrelated products cannot be overwritten',async()=>{
 let writes=0;
 const gql=async(query:string,variables:Record<string,any>)=>{
  if(!query.startsWith('query')){writes++;throw Error('Must not write');}
  return {products:{nodes:[{id:'gid://shopify/Product/123',title:'Other',status:'ACTIVE',handle:variables.query.slice(7),tags:[]}]}};
 };
 await assert.rejects(createShopifyDraft(gql,'task','p',{title:'Joggers',descriptionHtml:'Details'}),/does not belong/);
 assert.equal(writes,0);
});
test('untrusted draft HTML cannot add active content',()=>{
 const safe=safeDescription('<p onclick="x()">Hello</p><script>alert(1)</script><img src=x onerror=x()>');
 assert.equal(safe.includes('<script'),false);assert.equal(safe.includes('onclick'),false);assert.equal(safe.includes('<img'),false);
});
