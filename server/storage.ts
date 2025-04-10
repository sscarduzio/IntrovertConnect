import { 
  users, contacts, tags, contactTags, contactLogs, calendarEvents, eventContacts,
  User, InsertUser, Contact, InsertContact, Tag, InsertTag, 
  ContactTag, InsertContactTag, ContactLog, InsertContactLog, 
  ContactWithTags, ContactWithLogsAndTags, CalendarEvent, InsertCalendarEvent,
  EventContact, InsertEventContact, CalendarEventWithContacts
} from "@shared/schema";
import { db, pool } from "./db";
import connectPg from "connect-pg-simple";
import { eq, and, lt, gte, desc, inArray } from "drizzle-orm";
import express_session from "express-session";

const PostgresSessionStore = connectPg(express_session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contact methods
  getContactsByUserId(userId: number): Promise<ContactWithTags[]>;
  getContactById(id: number): Promise<ContactWithLogsAndTags | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;
  
  // Tag methods
  getTagsByUserId(userId: number): Promise<Tag[]>;
  getTagByName(name: string, userId: number): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: number): Promise<boolean>;
  
  // ContactTag methods
  getContactTagsByContactId(contactId: number): Promise<ContactTag[]>;
  getContactTagsByTagId(tagId: number): Promise<ContactTag[]>;
  createContactTag(contactTag: InsertContactTag): Promise<ContactTag>;
  deleteContactTagsByContactId(contactId: number): Promise<boolean>;
  
  // ContactLog methods
  getContactLogsByContactId(contactId: number): Promise<ContactLog[]>;
  createContactLog(contactLog: InsertContactLog): Promise<ContactLog>;
  
  // Calendar Event methods
  getCalendarEventsByUserId(userId: number): Promise<CalendarEventWithContacts[]>;
  getCalendarEventsByContactId(contactId: number): Promise<CalendarEventWithContacts[]>;
  getCalendarEvent(id: number): Promise<CalendarEventWithContacts | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEventWithContacts>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEventWithContacts | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
  
  // Event Contact methods
  getContactsByEventId(eventId: number): Promise<Contact[]>;
  getEventsByContactId(contactId: number): Promise<CalendarEvent[]>;
  addContactToEvent(eventId: number, contactId: number): Promise<EventContact>;
  removeContactFromEvent(eventId: number, contactId: number): Promise<boolean>;
  
  // Dashboard data
  getDueContacts(userId: number): Promise<ContactWithTags[]>;
  getRecentContacts(userId: number, limit: number): Promise<ContactWithTags[]>;
  getPopularTags(userId: number, limit: number): Promise<{tag: Tag, count: number}[]>;
  getUpcomingEvents(userId: number, limit: number): Promise<CalendarEventWithContacts[]>;
  
  // Session store for auth
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // Contact methods
  async getContactsByUserId(userId: number): Promise<ContactWithTags[]> {
    const result = await db.select().from(contacts).where(eq(contacts.userId, userId));
    
    // Get all contact tags for this user's contacts
    const contactIds = result.map(contact => contact.id);
    
    if (contactIds.length === 0) {
      return [];
    }
    
    const contactTagsResult = await db
      .select()
      .from(contactTags)
      .where(inArray(contactTags.contactId, contactIds));
      
    const tagIds = contactTagsResult.map(ct => ct.tagId);
    
    // Get all tags
    const tagsResult = tagIds.length > 0 
      ? await db.select().from(tags).where(inArray(tags.id, tagIds))
      : [];
    
    // Map contacts to include their tags
    return result.map(contact => {
      const contactTagIds = contactTagsResult
        .filter(ct => ct.contactId === contact.id)
        .map(ct => ct.tagId);
      const contactTags = tagsResult.filter(tag => contactTagIds.includes(tag.id));
      
      return {
        ...contact,
        relationshipScore: contact.relationshipScore || 50, // Default value if null
        contactFrequency: contact.contactFrequency || 0,    // Default value if null
        contactTrend: contact.contactTrend || "stable",     // Default value if null
        tags: contactTags
      };
    });
  }

  async getContactById(id: number): Promise<ContactWithLogsAndTags | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    
    if (!contact) {
      return undefined;
    }
    
    // Get contact tags
    const contactTagsResult = await db
      .select()
      .from(contactTags)
      .where(eq(contactTags.contactId, id));
      
    const tagIds = contactTagsResult.map(ct => ct.tagId);
    
    // Get tags
    const tagsResult = tagIds.length > 0 
      ? await db.select().from(tags).where(inArray(tags.id, tagIds))
      : [];
    
    // Get contact logs
    const logsResult = await db
      .select()
      .from(contactLogs)
      .where(eq(contactLogs.contactId, id))
      .orderBy(desc(contactLogs.contactDate));
    
    return {
      ...contact,
      relationshipScore: contact.relationshipScore || 50, // Default value if null
      contactFrequency: contact.contactFrequency || 0,    // Default value if null
      contactTrend: contact.contactTrend || "stable",     // Default value if null
      tags: tagsResult,
      logs: logsResult
    };
  }

  async createContact(contactData: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values({
      ...contactData,
      relationshipScore: contactData.relationshipScore || 50,
      contactFrequency: contactData.contactFrequency || 0,
      contactTrend: contactData.contactTrend || "stable"
    }).returning();
    return contact;
  }

  async updateContact(id: number, contactData: Partial<InsertContact>): Promise<Contact | undefined> {
    if (Object.keys(contactData).length === 0) {
      const contact = await this.getContactById(id);
      return contact as Contact | undefined;
    }
    
    const [updatedContact] = await db
      .update(contacts)
      .set({
        ...contactData,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();
      
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    // Delete associated contact logs
    await db.delete(contactLogs).where(eq(contactLogs.contactId, id));
    
    // Delete associated contact tags
    await db.delete(contactTags).where(eq(contactTags.contactId, id));
    
    // Get associated events 
    const eventContactsResult = await db.select().from(eventContacts).where(eq(eventContacts.contactId, id));
    const eventIds = eventContactsResult.map(ec => ec.eventId);
    
    // Delete associated event contacts
    await db.delete(eventContacts).where(eq(eventContacts.contactId, id));
    
    // Delete the contact
    const result = await db.delete(contacts).where(eq(contacts.id, id)).returning();
    return result.length > 0;
  }

  // Tag methods
  async getTagsByUserId(userId: number): Promise<Tag[]> {
    return await db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(tags.name);
  }

  async getTagByName(name: string, userId: number): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(
        eq(tags.name, name),
        eq(tags.userId, userId)
      ));
      
    return tag;
  }

  async createTag(tagData: InsertTag): Promise<Tag> {
    const [tag] = await db.insert(tags).values(tagData).returning();
    return tag;
  }

  async deleteTag(id: number): Promise<boolean> {
    // Delete associated contact tags
    await db.delete(contactTags).where(eq(contactTags.tagId, id));
    
    // Delete the tag
    const result = await db.delete(tags).where(eq(tags.id, id)).returning();
    return result.length > 0;
  }

  // ContactTag methods
  async getContactTagsByContactId(contactId: number): Promise<ContactTag[]> {
    return await db
      .select()
      .from(contactTags)
      .where(eq(contactTags.contactId, contactId));
  }

  async getContactTagsByTagId(tagId: number): Promise<ContactTag[]> {
    return await db
      .select()
      .from(contactTags)
      .where(eq(contactTags.tagId, tagId));
  }

  async createContactTag(contactTagData: InsertContactTag): Promise<ContactTag> {
    // Check if it already exists
    const [existing] = await db
      .select()
      .from(contactTags)
      .where(and(
        eq(contactTags.contactId, contactTagData.contactId),
        eq(contactTags.tagId, contactTagData.tagId)
      ));
      
    if (existing) {
      return existing;
    }
    
    const [contactTag] = await db.insert(contactTags).values(contactTagData).returning();
    return contactTag;
  }

  async deleteContactTagsByContactId(contactId: number): Promise<boolean> {
    const result = await db
      .delete(contactTags)
      .where(eq(contactTags.contactId, contactId))
      .returning();
      
    return result.length > 0;
  }

  // ContactLog methods
  async getContactLogsByContactId(contactId: number): Promise<ContactLog[]> {
    return await db
      .select()
      .from(contactLogs)
      .where(eq(contactLogs.contactId, contactId))
      .orderBy(desc(contactLogs.contactDate));
  }

  async createContactLog(contactLogData: InsertContactLog): Promise<ContactLog> {
    const [contactLog] = await db.insert(contactLogs).values(contactLogData).returning();
    
    // Update contact's lastContactDate and calculate next contact date
    const contact = await this.getContactById(contactLogData.contactId);
    
    if (contact) {
      // Check for resetReminder flag - if it's false, don't update the next contact date
      const shouldResetReminder = contactLogData.resetReminder !== false; // Default to true if not specified
      
      // Basic update with lastContactDate always
      const updateData: Partial<InsertContact> = {
        lastContactDate: contactLogData.contactDate,
        lastResponseDate: contactLogData.gotResponse ? contactLogData.contactDate : contact.lastResponseDate
      };
      
      // Only update nextContactDate and reminderFrequency if we should reset the reminder
      if (shouldResetReminder) {
        // Use reminderFrequency from contactLogData if provided, otherwise use the contact's value
        const reminderFrequency = contactLogData.reminderFrequency || contact.reminderFrequency;
        
        // Calculate next contact date by adding months (not days)
        const nextContactDate = new Date(contactLogData.contactDate);
        nextContactDate.setMonth(nextContactDate.getMonth() + reminderFrequency);
        
        updateData.nextContactDate = nextContactDate;
        updateData.reminderFrequency = reminderFrequency; // Update the reminder frequency if it was changed
      }
      
      await this.updateContact(contact.id, updateData);
      
      // Calculate and update relationship metrics
      await this.calculateRelationshipMetrics(contact.id);
    }
    
    return contactLog;
  }

  // Calculate relationship metrics for a contact
  private async calculateRelationshipMetrics(contactId: number): Promise<void> {
    const contact = await this.getContactById(contactId);
    if (!contact) return;
    
    const logs = await this.getContactLogsByContactId(contactId);
    
    // Skip if no logs
    if (logs.length === 0) return;
    
    // Calculate metrics
    const totalLogs = logs.length;
    const responseLogs = logs.filter(log => log.gotResponse).length;
    const responseRate = totalLogs > 0 ? responseLogs / totalLogs : 0;
    
    // Calculate contact frequency (average days between contacts)
    let contactFrequency = contact.reminderFrequency;
    if (logs.length > 1) {
      const sortedLogs = [...logs].sort((a, b) => new Date(a.contactDate).getTime() - new Date(b.contactDate).getTime());
      let totalDays = 0;
      
      for (let i = 1; i < sortedLogs.length; i++) {
        const days = Math.round(
          (new Date(sortedLogs[i].contactDate).getTime() - new Date(sortedLogs[i-1].contactDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        totalDays += days;
      }
      
      contactFrequency = Math.round(totalDays / (sortedLogs.length - 1));
    }
    
    // Determine trend
    let contactTrend = "stable";
    if (logs.length >= 3) {
      const sortedLogs = [...logs].sort((a, b) => new Date(a.contactDate).getTime() - new Date(b.contactDate).getTime());
      const recentGaps = [];
      
      for (let i = 1; i < sortedLogs.length; i++) {
        const gap = Math.round(
          (new Date(sortedLogs[i].contactDate).getTime() - new Date(sortedLogs[i-1].contactDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        recentGaps.push(gap);
      }
      
      // Calculate trend based on recent gaps
      if (recentGaps.length >= 2) {
        const recent = recentGaps.slice(-2); // Last two gaps
        const avg = recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length;
        
        if (recent[0] < avg && recent[1] < avg) {
          contactTrend = "increasing";
        } else if (recent[0] > avg && recent[1] > avg) {
          contactTrend = "decreasing";
        }
      }
    }
    
    // Calculate relationship score (0-100)
    // Factors: response rate, recent activity, contact frequency adherence
    const responseScore = responseRate * 40; // 40% of score
    
    // Recent activity score - higher if contacted recently
    let recentActivityScore = 0;
    if (contact.lastContactDate) {
      const daysSinceLastContact = Math.round(
        (new Date().getTime() - new Date(contact.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      recentActivityScore = Math.max(0, 30 - Math.min(30, daysSinceLastContact)); // 30% of score
    }
    
    // Frequency adherence score - higher if contacting on schedule
    let frequencyScore = 0;
    if (logs.length >= 2) {
      const adherenceRatio = contactFrequency / contact.reminderFrequency;
      frequencyScore = adherenceRatio > 1 ? 30 / adherenceRatio : 30 * adherenceRatio; // 30% of score
    } else {
      frequencyScore = 15; // Default for new contacts
    }
    
    const relationshipScore = Math.round(responseScore + recentActivityScore + frequencyScore);
    
    // Update the contact with new metrics
    await db
      .update(contacts)
      .set({
        relationshipScore,
        contactFrequency,
        contactTrend,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, contactId));
  }

  // Calendar Event methods
  async getCalendarEventsByUserId(userId: number): Promise<CalendarEventWithContacts[]> {
    const events = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .orderBy(calendarEvents.startDate);
      
    return await this.hydrateEventsWithContacts(events);
  }

  async getCalendarEventsByContactId(contactId: number): Promise<CalendarEventWithContacts[]> {
    // Get event IDs that have this contact
    const eventContactsResult = await db
      .select()
      .from(eventContacts)
      .where(eq(eventContacts.contactId, contactId));
      
    if (eventContactsResult.length === 0) {
      return [];
    }
    
    const eventIds = eventContactsResult.map(ec => ec.eventId);
    
    // Get full event data
    const events = await db
      .select()
      .from(calendarEvents)
      .where(inArray(calendarEvents.id, eventIds))
      .orderBy(calendarEvents.startDate);
      
    return await this.hydrateEventsWithContacts(events);
  }

  async getCalendarEvent(id: number): Promise<CalendarEventWithContacts | undefined> {
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id));
      
    if (!event) {
      return undefined;
    }
    
    const [eventWithContacts] = await this.hydrateEventsWithContacts([event]);
    return eventWithContacts;
  }

  async createCalendarEvent(eventData: InsertCalendarEvent): Promise<CalendarEventWithContacts> {
    // Extract contactIds from eventData
    const { contactIds, ...calendarEventData } = eventData;
    
    // Create the event without contacts
    const [event] = await db.insert(calendarEvents).values(calendarEventData).returning();
    
    // Add all contacts to the event
    for (const contactId of contactIds) {
      await this.addContactToEvent(event.id, contactId);
    }
    
    // Return the event with hydrated contacts
    return await this.getCalendarEvent(event.id) as CalendarEventWithContacts;
  }

  async updateCalendarEvent(id: number, eventData: Partial<InsertCalendarEvent>): Promise<CalendarEventWithContacts | undefined> {
    // Extract contactIds if present
    const { contactIds, ...calendarEventData } = eventData;
    
    if (Object.keys(calendarEventData).length > 0) {
      // Update the event data
      await db
        .update(calendarEvents)
        .set(calendarEventData)
        .where(eq(calendarEvents.id, id));
    }
    
    // If contactIds is provided, update the event-contact relationships
    if (contactIds) {
      // Delete existing relationships
      await db.delete(eventContacts).where(eq(eventContacts.eventId, id));
      
      // Add new relationships
      for (const contactId of contactIds) {
        await this.addContactToEvent(id, contactId);
      }
    }
    
    // Return the updated event with hydrated contacts
    return await this.getCalendarEvent(id);
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    // Delete event-contact relationships first
    await db.delete(eventContacts).where(eq(eventContacts.eventId, id));
    
    // Delete the event
    const result = await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .returning();
      
    return result.length > 0;
  }
  
  // Event Contact methods
  async getContactsByEventId(eventId: number): Promise<Contact[]> {
    const eventContactsResult = await db
      .select()
      .from(eventContacts)
      .where(eq(eventContacts.eventId, eventId));
      
    if (eventContactsResult.length === 0) {
      return [];
    }
    
    // Get all contact IDs
    const contactIds = Array.from(new Set(eventContactsResult.map(ec => ec.contactId)));
    
    return await db
      .select()
      .from(contacts)
      .where(inArray(contacts.id, contactIds));
  }
  
  async getEventsByContactId(contactId: number): Promise<CalendarEvent[]> {
    const eventContactsResult = await db
      .select()
      .from(eventContacts)
      .where(eq(eventContacts.contactId, contactId));
      
    if (eventContactsResult.length === 0) {
      return [];
    }
    
    const eventIds = eventContactsResult.map(ec => ec.eventId);
    
    return await db
      .select()
      .from(calendarEvents)
      .where(inArray(calendarEvents.id, eventIds))
      .orderBy(calendarEvents.startDate);
  }
  
  async addContactToEvent(eventId: number, contactId: number): Promise<EventContact> {
    // Check if it already exists
    const [existing] = await db
      .select()
      .from(eventContacts)
      .where(and(
        eq(eventContacts.eventId, eventId),
        eq(eventContacts.contactId, contactId)
      ));
      
    if (existing) {
      return existing;
    }
    
    // Add the new relationship
    const [eventContact] = await db
      .insert(eventContacts)
      .values({ eventId, contactId })
      .returning();
      
    return eventContact;
  }
  
  async removeContactFromEvent(eventId: number, contactId: number): Promise<boolean> {
    const result = await db
      .delete(eventContacts)
      .where(and(
        eq(eventContacts.eventId, eventId),
        eq(eventContacts.contactId, contactId)
      ))
      .returning();
      
    return result.length > 0;
  }
  
  // Helper method to hydrate events with their contacts
  private async hydrateEventsWithContacts(events: CalendarEvent[]): Promise<CalendarEventWithContacts[]> {
    if (events.length === 0) {
      return [];
    }
    
    const eventIds = events.map(e => e.id);
    
    // Get all event-contact relationships for these events
    const eventContactsResult = await db
      .select()
      .from(eventContacts)
      .where(inArray(eventContacts.eventId, eventIds));
      
    // Get all contact IDs
    const contactIds = Array.from(new Set(eventContactsResult.map(ec => ec.contactId)));
    
    // If no contacts, return events with empty contacts array
    if (contactIds.length === 0) {
      return events.map(event => ({ ...event, contacts: [] }));
    }
    
    // Get all contacts
    const contactsResult = await db
      .select()
      .from(contacts)
      .where(inArray(contacts.id, contactIds));
    
    // Map events to include their contacts
    return events.map(event => {
      const eventContactIds = eventContactsResult
        .filter(ec => ec.eventId === event.id)
        .map(ec => ec.contactId);
        
      const eventContacts = contactsResult.filter(contact => eventContactIds.includes(contact.id));
      
      return {
        ...event,
        contacts: eventContacts
      };
    });
  }

  // Dashboard data methods
  async getDueContacts(userId: number): Promise<ContactWithTags[]> {
    // Get all contacts for this user
    const allContacts = await this.getContactsByUserId(userId);
    
    // Filter contacts that have a nextContactDate (due for contact)
    return allContacts.filter(contact => contact.nextContactDate !== null);
  }

  async getRecentContacts(userId: number, limit: number): Promise<ContactWithTags[]> {
    const allContacts = await this.getContactsByUserId(userId);
    
    // Filter contacts with lastContactDate and sort by most recent
    return allContacts
      .filter(contact => contact.lastContactDate !== null)
      .sort((a, b) => {
        const dateA = new Date(a.lastContactDate!).getTime();
        const dateB = new Date(b.lastContactDate!).getTime();
        return dateB - dateA; // Descending order
      })
      .slice(0, limit);
  }

  async getPopularTags(userId: number, limit: number): Promise<{tag: Tag, count: number}[]> {
    // Get all user's tags
    const userTags = await this.getTagsByUserId(userId);
    
    if (userTags.length === 0) {
      return [];
    }
    
    // Get counts for each tag
    const tagCounts: {tag: Tag, count: number}[] = [];
    
    for (const tag of userTags) {
      const contactTags = await this.getContactTagsByTagId(tag.id);
      tagCounts.push({
        tag,
        count: contactTags.length
      });
    }
    
    // Sort by count (descending) and take top N
    return tagCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getUpcomingEvents(userId: number, limit: number): Promise<CalendarEventWithContacts[]> {
    const now = new Date();
    
    const events = await db
      .select()
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.startDate, now)
      ))
      .orderBy(calendarEvents.startDate)
      .limit(limit);
      
    return await this.hydrateEventsWithContacts(events);
  }
}

export const storage = new DatabaseStorage();