import { User, InsertUser, Contact, InsertContact, Tag, InsertTag, ContactTag, InsertContactTag, ContactLog, InsertContactLog, ContactWithTags, ContactWithLogsAndTags } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  
  // Dashboard data
  getDueContacts(userId: number): Promise<ContactWithTags[]>;
  getRecentContacts(userId: number, limit: number): Promise<ContactWithTags[]>;
  getPopularTags(userId: number, limit: number): Promise<{tag: Tag, count: number}[]>;
  
  // Session store for auth
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private tags: Map<number, Tag>;
  private contactTags: Map<number, ContactTag>;
  private contactLogs: Map<number, ContactLog>;
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private contactIdCounter: number;
  private tagIdCounter: number;
  private contactTagIdCounter: number;
  private contactLogIdCounter: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.tags = new Map();
    this.contactTags = new Map();
    this.contactLogs = new Map();
    
    this.userIdCounter = 1;
    this.contactIdCounter = 1;
    this.tagIdCounter = 1;
    this.contactTagIdCounter = 1;
    this.contactLogIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...userData, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // Contact methods
  async getContactsByUserId(userId: number): Promise<ContactWithTags[]> {
    const userContacts = Array.from(this.contacts.values()).filter(
      (contact) => contact.userId === userId,
    );
    
    return Promise.all(userContacts.map(async (contact) => {
      const tags = await this.getTagsForContact(contact.id);
      return { ...contact, tags };
    }));
  }

  async getContactById(id: number): Promise<ContactWithLogsAndTags | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    const tags = await this.getTagsForContact(id);
    const logs = await this.getContactLogsByContactId(id);
    
    return { ...contact, tags, logs };
  }

  async createContact(contactData: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const now = new Date();
    
    // Handle tags separately
    const tags = contactData.tags || [];
    const contactDataWithoutTags = { ...contactData };
    delete contactDataWithoutTags.tags;
    
    // Calculate next contact date based on reminder frequency
    const reminderFrequency = contactData.reminderFrequency || 3; // Default is 3 months if not specified
    const nextContactDate = new Date(now);
    nextContactDate.setMonth(nextContactDate.getMonth() + reminderFrequency);
    
    const contact: Contact = {
      ...contactDataWithoutTags,
      id,
      email: contactData.email || null,
      phone: contactData.phone || null,
      notes: contactData.notes || null,
      lastContactDate: contactData.lastContactDate || null,
      // Set the next contact date automatically
      nextContactDate: contactData.nextContactDate || nextContactDate,
      createdAt: now,
      updatedAt: now,
    };
    
    this.contacts.set(id, contact);
    
    // Create tags and associate them with the contact
    if (tags.length > 0) {
      for (const tagName of tags) {
        // Check if tag already exists for this user
        let tag = await this.getTagByName(tagName, contactData.userId);
        
        // If it doesn't exist, create it
        if (!tag) {
          tag = await this.createTag({ 
            name: tagName, 
            userId: contactData.userId 
          });
        }
        
        // Create association between contact and tag
        await this.createContactTag({
          contactId: id,
          tagId: tag.id,
        });
      }
    }
    
    return contact;
  }

  async updateContact(id: number, contactData: Partial<InsertContact>): Promise<Contact | undefined> {
    const existingContact = this.contacts.get(id);
    if (!existingContact) return undefined;
    
    // Handle tags separately if present
    const tags = contactData.tags;
    const contactDataWithoutTags = { ...contactData };
    delete contactDataWithoutTags.tags;
    
    const updatedContact: Contact = {
      ...existingContact,
      ...contactDataWithoutTags,
      updatedAt: new Date(),
    };
    
    this.contacts.set(id, updatedContact);
    
    // Update tags if provided
    if (tags) {
      // First, remove all existing tag associations
      await this.deleteContactTagsByContactId(id);
      
      // Then create new ones
      for (const tagName of tags) {
        let tag = await this.getTagByName(tagName, existingContact.userId);
        
        if (!tag) {
          tag = await this.createTag({ 
            name: tagName, 
            userId: existingContact.userId 
          });
        }
        
        await this.createContactTag({
          contactId: id,
          tagId: tag.id,
        });
      }
    }
    
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    const exists = this.contacts.has(id);
    if (!exists) return false;
    
    // Delete all related contact-tag associations
    await this.deleteContactTagsByContactId(id);
    
    // Delete all contact logs associated with this contact
    const contactLogs = await this.getContactLogsByContactId(id);
    for (const log of contactLogs) {
      this.contactLogs.delete(log.id);
    }
    
    // Delete the contact
    this.contacts.delete(id);
    return true;
  }

  // Tag methods
  async getTagsByUserId(userId: number): Promise<Tag[]> {
    return Array.from(this.tags.values()).filter(
      (tag) => tag.userId === userId,
    );
  }

  async getTagByName(name: string, userId: number): Promise<Tag | undefined> {
    return Array.from(this.tags.values()).find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase() && tag.userId === userId,
    );
  }

  async createTag(tagData: InsertTag): Promise<Tag> {
    const id = this.tagIdCounter++;
    const now = new Date();
    
    const tag: Tag = {
      ...tagData,
      id,
      createdAt: now,
    };
    
    this.tags.set(id, tag);
    return tag;
  }

  async deleteTag(id: number): Promise<boolean> {
    const exists = this.tags.has(id);
    if (!exists) return false;
    
    // Delete all contact-tag associations for this tag
    const contactTags = await this.getContactTagsByTagId(id);
    for (const contactTag of contactTags) {
      this.contactTags.delete(contactTag.id);
    }
    
    // Delete the tag
    this.tags.delete(id);
    return true;
  }

  // ContactTag methods
  async getContactTagsByContactId(contactId: number): Promise<ContactTag[]> {
    return Array.from(this.contactTags.values()).filter(
      (ct) => ct.contactId === contactId,
    );
  }

  async getContactTagsByTagId(tagId: number): Promise<ContactTag[]> {
    return Array.from(this.contactTags.values()).filter(
      (ct) => ct.tagId === tagId,
    );
  }

  async createContactTag(contactTagData: InsertContactTag): Promise<ContactTag> {
    const id = this.contactTagIdCounter++;
    
    const contactTag: ContactTag = {
      ...contactTagData,
      id,
    };
    
    this.contactTags.set(id, contactTag);
    return contactTag;
  }

  async deleteContactTagsByContactId(contactId: number): Promise<boolean> {
    const contactTags = await this.getContactTagsByContactId(contactId);
    for (const contactTag of contactTags) {
      this.contactTags.delete(contactTag.id);
    }
    return true;
  }

  // ContactLog methods
  async getContactLogsByContactId(contactId: number): Promise<ContactLog[]> {
    return Array.from(this.contactLogs.values())
      .filter((log) => log.contactId === contactId)
      .sort((a, b) => b.contactDate.getTime() - a.contactDate.getTime());
  }

  async createContactLog(contactLogData: InsertContactLog): Promise<ContactLog> {
    const id = this.contactLogIdCounter++;
    const now = new Date();
    
    const contactLog: ContactLog = {
      ...contactLogData,
      id,
      createdAt: now,
    };
    
    this.contactLogs.set(id, contactLog);
    
    // Update the contact's last contact date
    const contact = this.contacts.get(contactLogData.contactId);
    if (contact) {
      // Determine which reminder frequency to use (provided or default)
      const reminderFrequency = contactLogData.reminderFrequency !== undefined 
        ? contactLogData.reminderFrequency 
        : contact.reminderFrequency;
      
      // Calculate the next contact date based on the reminder frequency
      const nextContactDate = new Date(contactLogData.contactDate);
      nextContactDate.setMonth(nextContactDate.getMonth() + reminderFrequency);
      
      const updatedContact: Contact = {
        ...contact,
        lastContactDate: contactLogData.contactDate,
        nextContactDate: nextContactDate,
        // Update the contact's reminder frequency if a new one was provided
        reminderFrequency: contactLogData.reminderFrequency !== undefined 
          ? reminderFrequency 
          : contact.reminderFrequency,
        updatedAt: now,
      };
      
      this.contacts.set(contact.id, updatedContact);
    }
    
    return contactLog;
  }

  // Helper methods
  private async getTagsForContact(contactId: number): Promise<Tag[]> {
    const contactTags = await this.getContactTagsByContactId(contactId);
    const tagIds = contactTags.map((ct) => ct.tagId);
    
    return Array.from(this.tags.values()).filter(
      (tag) => tagIds.includes(tag.id),
    );
  }

  // Dashboard data
  async getDueContacts(userId: number): Promise<ContactWithTags[]> {
    const now = new Date();
    const userContacts = Array.from(this.contacts.values()).filter(
      (contact) => 
        contact.userId === userId && 
        contact.nextContactDate !== null && 
        contact.nextContactDate <= now
    );
    
    // Sort by how overdue they are (most overdue first)
    userContacts.sort((a, b) => {
      if (!a.nextContactDate || !b.nextContactDate) return 0;
      return a.nextContactDate.getTime() - b.nextContactDate.getTime();
    });
    
    return Promise.all(userContacts.map(async (contact) => {
      const tags = await this.getTagsForContact(contact.id);
      return { ...contact, tags };
    }));
  }

  async getRecentContacts(userId: number, limit: number): Promise<ContactWithTags[]> {
    const userContacts = Array.from(this.contacts.values())
      .filter((contact) => contact.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
    
    return Promise.all(userContacts.map(async (contact) => {
      const tags = await this.getTagsForContact(contact.id);
      return { ...contact, tags };
    }));
  }

  async getPopularTags(userId: number, limit: number): Promise<{tag: Tag, count: number}[]> {
    const userTags = await this.getTagsByUserId(userId);
    
    const tagCounts = await Promise.all(userTags.map(async (tag) => {
      const contactTags = await this.getContactTagsByTagId(tag.id);
      return {
        tag,
        count: contactTags.length,
      };
    }));
    
    // Sort by count in descending order and take the top 'limit'
    return tagCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
