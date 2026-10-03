import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const hub = sqliteTable('hub', { owner: text('owner').primaryKey(), data: text('data').notNull() });
export const profiles = sqliteTable('profiles', { userId: text('user_id').primaryKey(), name: text('name').notNull(), color: text('color').notNull() });
