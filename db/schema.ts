import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', { owner: text('owner').primaryKey(), payload: text('payload').notNull() });
export const items = sqliteTable('items', { owner: text('owner').notNull(), id: text('id').notNull(), kind: text('kind').notNull(), payload: text('payload').notNull(), updatedAt: text('updated_at').notNull() }, t => [primaryKey({columns:[t.owner,t.id]})]);
export const stores = sqliteTable('stores', {owner:text('owner').notNull(),shop:text('shop').notNull(),name:text('name').notNull(),credentials:text('credentials').notNull(),scopes:text('scopes').notNull(),connectedAt:text('connected_at').notNull()},t=>[primaryKey({columns:[t.owner,t.shop]})]);
export const oauthStates = sqliteTable('oauth_states',{state:text('state').primaryKey(),owner:text('owner').notNull(),shop:text('shop').notNull(),expiresAt:text('expires_at').notNull()});
// Execution authority lives outside the client-editable library items.
export const executions = sqliteTable('executions',{
 owner:text('owner').notNull(),id:text('id').notNull(),sessionId:text('session_id'),
 turnId:text('turn_id'),submissionKey:text('submission_key').notNull(),
 status:text('status').notNull(),input:text('input').notNull(),result:text('result'),
 error:text('error'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]})]);
