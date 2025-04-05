import { 
  users, contacts, tags, contactTags, contactLogs, calendarEvents,
  User, InsertUser, Contact, InsertContact, Tag, InsertTag, 
  ContactTag, InsertContactTag, ContactLog, InsertContactLog, 
  ContactWithTags, ContactWithLogsAndTags, CalendarEvent, InsertCalendarEvent 
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
  getCalendarEventsByUserId(userId: number): Promise<CalendarEvent[]>;
  getCalendarEventsByContactId(contactId: number): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
  
  // Dashboard data
  getDueContacts(userId: number): Promise<ContactWithTags[]>;
  getRecentContacts(userId: number, limit: number): Promise<ContactWithTags[]>;
  getPopularTags(userId: number, limit: number): Promise<{tag: Tag, count: number}[]>;
  getUpcomingEvents(userId: number, limit: number): Promise<CalendarEvent[]>;
  
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
    
    // Delete associated calendar events
    await db.delete(calendarEvents).where(eq(calendarEvents.contactId, id));
    
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
      // Use reminderFrequency from contactLogData if provided, otherwise use the contact's value
      const reminderFrequency = contactLogData.reminderFrequency || contact.reminderFrequency;
      
      // Calculate next contact date by adding months (not days)
      const nextContactDate = new Date(contactLogData.contactDate);
      nextContactDate.setMonth(nextContactDate.getMonth() + reminderFrequency);
      
      await this.updateContact(contact.id, {
        lastContactDate: contactLogData.contactDate,
        nextContactDate,
        reminderFrequency, // Update the reminder frequency if it was changed
        lastResponseDate: contactLogData.gotResponse ? contactLogData.contactDate : contact.lastResponseDate
      });
      
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
  async getCalendarEventsByUserId(userId: number): Promise<CalendarEvent[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .orderBy(calendarEvents.startDate);
  }

  async getCalendarEventsByContactId(contactId: number): Promise<CalendarEvent[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.contactId, contactId))
      .orderBy(calendarEvents.startDate);
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id));
      
    return event;
  }

  async createCalendarEvent(eventData: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db.insert(calendarEvents).values(eventData).returning();
    return event;
  }

  async updateCalendarEvent(id: number, eventData: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    if (Object.keys(eventData).length === 0) {
      return this.getCalendarEvent(id);
    }
    
    const [updatedEvent] = await db
      .update(calendarEvents)
      .set(eventData)
      .where(eq(calendarEvents.id, id))
      .returning();
      
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    const result = await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .returning();
      
    return result.length > 0;
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

  async getUpcomingEvents(userId: number, limit: number): Promise<CalendarEvent[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.startDate, now)
      ))
      .orderBy(calendarEvents.startDate)
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();