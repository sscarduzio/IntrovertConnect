import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  lastContactDate: timestamp("last_contact_date"),
  nextContactDate: timestamp("next_contact_date"),
  reminderFrequency: integer("reminder_frequency").notNull().default(3), // months
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactTags = pgTable("contact_tags", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  tagId: integer("tag_id").notNull(),
});

export const contactLogs = pgTable("contact_logs", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  contactDate: timestamp("contact_date").notNull(),
  contactType: text("contact_type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertContactSchema = createInsertSchema(contacts)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    tags: z.array(z.string()).optional(),
  });

export const insertTagSchema = createInsertSchema(tags).pick({
  name: true,
  userId: true,
});

export const insertContactTagSchema = createInsertSchema(contactTags).pick({
  contactId: true,
  tagId: true,
});

export const insertContactLogSchema = createInsertSchema(contactLogs).omit({
  id: true,
  createdAt: true,
});

// Response types for API
export type ContactWithTags = {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  lastContactDate: Date | null;
  nextContactDate: Date | null;
  reminderFrequency: number;
  createdAt: Date;
  updatedAt: Date;
  tags: Tag[];
};

export type ContactWithLogsAndTags = ContactWithTags & {
  logs: ContactLog[];
};

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type ContactTag = typeof contactTags.$inferSelect;
export type InsertContactTag = z.infer<typeof insertContactTagSchema>;
export type ContactLog = typeof contactLogs.$inferSelect;
export type InsertContactLog = z.infer<typeof insertContactLogSchema>;
