import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listingSchema,listingInput,listingIssues} from '../lib/shopify-listing.ts';
import {createShopifyDraft} from '../lib/shopify-draft.ts';
const draft={title:'Joggers',descriptionHtml:'<p>High waist.</p>',currency:'PLN',images:[{url:'https://example.com/p.jpg',sourceUrl:'https://example.com/product',alt:'Grey joggers'}],options:[{name:'Size',values:['S','M']}],variants:[{options:[{name:'Size',value:'S'}],price:'179.00',sourceUrl:'https://example.com/product'},{options:[{name:'Size',value:'M'}],price:'179.00',sourceUrl:'https://example.com/product'}]};
test('rejects fabricated combinations, duplicates and prices without currency',()=>{
 assert.equal(listingSchema.safeParse({...draft,currency:undefined}).success,false);
 assert.equal(listingSchema.safeParse({...draft,variants:[draft.variants[0],draft.variants[0]]}).success,false);
 assert.equal(listingSchema.safeParse({...draft,variants:[{...draft.variants[0],options:[{name:'Size',value:'XXL'}]}]}).success,false);
});
test('currency mismatch stops before any write',async()=>{
 let writes=0;
 await assert.rejects(createShopifyDraft(async(q)=>{
  if(q.includes('WorkspaceCurrency'))return {shop:{currencyCode:'USD'}};
  if(q.startsWith('query'))return {products:{nodes:[]}};
  writes++;throw Error('unexpected write');
 },'task','product',draft),/currency/);assert.equal(writes,0);
});
test('imports exact variants and images then detects failed image processing',async()=>{
 let saved:any=null,mutation:any;
 const result=await createShopifyDraft(async(q,v:any)=>{
  if(q.includes('WorkspaceCurrency'))return {shop:{currencyCode:'PLN'}};
  if(q.startsWith('query'))return {products:{nodes:saved?[saved]:[]}};
  mutation=v.input;
  saved={...v.input,id:'gid://shopify/Product/123',variants:{nodes:v.input.variants.map((x:any)=>({price:x.price,selectedOptions:x.optionValues.map((o:any)=>({name:o.optionName,value:o.name}))}))},media:{nodes:[{status:'FAILED',image:null}]}};
  return {productSet:{product:saved,userErrors:[]}};
 },'task','product',draft);
 assert.equal(mutation.variants.length,2);assert.equal(mutation.files[0].originalSource,draft.images[0].url);
 assert.equal(result.issues.includes('Images are still processing or failed'),true);
});
test('readback flags missing and incorrectly priced variants',()=>{
 const parsed=listingSchema.parse(draft);
 const issues=listingIssues(parsed,{variants:{nodes:[{price:'1.00',selectedOptions:[{name:'Size',value:'S'}]}]},media:{nodes:[]}});
 assert.equal(issues.includes('Variant price or SKU differs'),true);
 assert.equal(issues.some(s=>s.includes('Variant missing')),true);
 assert.equal(issues.includes('Image count differs'),true);
 assert.equal((listingInput(parsed) as any).variants.length,2);
});
