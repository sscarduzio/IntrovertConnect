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
  relationshipScore: integer("relationship_score").default(50), // 0-100 scale
  contactFrequency: integer("contact_frequency").default(0), // number of contacts in last 6 months
  contactTrend: text("contact_trend").default("stable"), // "improving", "stable", "declining"
  lastResponseDate: timestamp("last_response_date"), // when the contact last responded
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
  gotResponse: boolean("got_response").default(false),
  responseDate: timestamp("response_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  location: text("location"),
  reminderMinutes: integer("reminder_minutes").default(30),
  syncedWithExternal: boolean("synced_with_external").default(false),
  externalEventId: text("external_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New junction table for event-contact many-to-many relationship
export const eventContacts = pgTable("event_contacts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  contactId: integer("contact_id").notNull(),
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
}).extend({
  // Override the contactDate field to accept string
  contactDate: z.union([z.string(), z.date()]).transform(val => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  reminderFrequency: z.number().optional(),
  gotResponse: z.boolean().default(false),
  responseDate: z.union([z.string(), z.date(), z.null()]).optional().transform(val => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val || null;
  }),
  // Add resetReminder flag for mark as attended functionality
  resetReminder: z.boolean().optional(),
});

// New schema for event contacts
export const insertEventContactSchema = createInsertSchema(eventContacts)
  .omit({ id: true, createdAt: true });

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
  relationshipScore: number;
  contactFrequency: number;
  contactTrend: string;
  lastResponseDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  tags: Tag[];
};

export type ContactWithLogsAndTags = ContactWithTags & {
  logs: ContactLog[];
};

export const insertCalendarEventSchema = createInsertSchema(calendarEvents)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Override date fields to accept strings
    startDate: z.union([z.string(), z.date()]).transform(val => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    endDate: z.union([z.string(), z.date()]).transform(val => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    // Add contactIds array to handle multiple contacts
    contactIds: z.array(z.number()).min(1),
  });

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
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type EventContact = typeof eventContacts.$inferSelect;
export type InsertEventContact = z.infer<typeof insertEventContactSchema>;

// Type for calendar event with hydrated contacts
export type CalendarEventWithContacts = CalendarEvent & {
  contacts: Contact[];
};
