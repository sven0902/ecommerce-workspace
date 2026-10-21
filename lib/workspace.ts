import { z } from 'zod';
export const profileSchema=z.object({name:z.string().max(100),storeUrl:z.union([z.literal(''),z.string().url().refine(v=>v.startsWith('https://'))]),niche:z.string().max(500),market:z.string().max(100),language:z.string().max(100),competitors:z.string().max(2000),brandVoice:z.string().max(1000)});
export const defaultProfile={name:'My workspace',storeUrl:'',niche:'',market:'United States',language:'English',competitors:'',brandVoice:''};
export const itemSchema=z.object({id:z.string().uuid(),kind:z.enum(['request','product','creative']),title:z.string().min(1).max(200),body:z.string().max(15000),url:z.union([z.literal(''),z.string().url().refine(v=>v.startsWith('https://'))]),status:z.enum(['draft','running','failed','needs_setup','review','ready','testing','tested','invalid']),prompt:z.string().optional(),sources:z.array(z.object({title:z.string(),url:z.string().url()})).optional(),createdAt:z.string().datetime()});
export type Profile=z.infer<typeof profileSchema>;
export type Item=z.infer<typeof itemSchema>;
