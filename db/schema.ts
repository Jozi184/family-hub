import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const hub = sqliteTable('hub', { owner: text('owner').primaryKey(), data: text('data').notNull() });
