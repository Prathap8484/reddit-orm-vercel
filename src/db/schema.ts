import { pgTable, serial, text, timestamp, varchar, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Clients Table: Represents the different agency clients
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  website: varchar('website', { length: 255 }),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Personas Table: Different posting personas associated with a client
export const personas = pgTable('personas', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  targetSubreddits: jsonb('target_subreddits').$type<string[]>(),
  tone: varchar('tone', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Logs Table: Records automated posts made on behalf of a client
export const logs = pgTable('logs', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  postId: varchar('post_id', { length: 255 }).notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});

// --- Relations Definitions ---

export const clientsRelations = relations(clients, ({ many }) => ({
  personas: many(personas),
  logs: many(logs),
}));

export const personasRelations = relations(personas, ({ one }) => ({
  client: one(clients, {
    fields: [personas.clientId],
    references: [clients.id],
  }),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  client: one(clients, {
    fields: [logs.clientId],
    references: [clients.id],
  }),
}));
