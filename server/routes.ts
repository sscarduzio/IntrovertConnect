import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { processReminders } from "./email";
import { z } from "zod";
import { 
  insertContactSchema, 
  insertTagSchema, 
  insertContactLogSchema
} from "@shared/schema";

// Middleware to ensure user is authenticated
function ensureAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  setupAuth(app);

  // Contact routes
  app.get("/api/contacts", ensureAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getContactsByUserId(req.user!.id);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contacts", error });
    }
  });

  app.get("/api/contacts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getContactById(parseInt(req.params.id));
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Check if contact belongs to current user
      if (contact.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contact", error });
    }
  });

  app.post("/api/contacts", ensureAuthenticated, async (req, res) => {
    try {
      const validated = insertContactSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const contact = await storage.createContact(validated);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating contact", error });
    }
  });

  app.patch("/api/contacts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Check if contact exists and belongs to user
      const existingContact = await storage.getContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      if (existingContact.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validated = insertContactSchema.partial().parse(req.body);
      
      const updatedContact = await storage.updateContact(contactId, validated);
      res.json(updatedContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating contact", error });
    }
  });

  app.delete("/api/contacts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Check if contact exists and belongs to user
      const existingContact = await storage.getContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      if (existingContact.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteContact(contactId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting contact", error });
    }
  });

  // Tag routes
  app.get("/api/tags", ensureAuthenticated, async (req, res) => {
    try {
      const tags = await storage.getTagsByUserId(req.user!.id);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tags", error });
    }
  });

  app.post("/api/tags", ensureAuthenticated, async (req, res) => {
    try {
      const validated = insertTagSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      // Check if tag already exists
      const existingTag = await storage.getTagByName(validated.name, req.user!.id);
      if (existingTag) {
        return res.status(400).json({ message: "Tag already exists" });
      }
      
      const tag = await storage.createTag(validated);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tag data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating tag", error });
    }
  });

  app.delete("/api/tags/:id", ensureAuthenticated, async (req, res) => {
    try {
      const tagId = parseInt(req.params.id);
      
      // Check if tag exists
      const tags = await storage.getTagsByUserId(req.user!.id);
      const tag = tags.find(t => t.id === tagId);
      
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      await storage.deleteTag(tagId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting tag", error });
    }
  });

  // Contact Log routes
  app.post("/api/contacts/:id/logs", ensureAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Check if contact exists and belongs to user
      const existingContact = await storage.getContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      if (existingContact.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validated = insertContactLogSchema.parse({
        ...req.body,
        contactId
      });
      
      const contactLog = await storage.createContactLog(validated);
      
      // Get the updated contact
      const updatedContact = await storage.getContactById(contactId);
      
      res.status(201).json({ log: contactLog, contact: updatedContact });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid log data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating contact log", error });
    }
  });

  // Dashboard data
  app.get("/api/dashboard", ensureAuthenticated, async (req, res) => {
    try {
      const dueContacts = await storage.getDueContacts(req.user!.id);
      const recentContacts = await storage.getRecentContacts(req.user!.id, 5);
      const popularTags = await storage.getPopularTags(req.user!.id, 10);
      
      const allContacts = await storage.getContactsByUserId(req.user!.id);
      
      const dashboardData = {
        stats: {
          totalContacts: allContacts.length,
          dueContacts: dueContacts.length,
          topTag: popularTags.length > 0 
            ? { name: popularTags[0].tag.name, count: popularTags[0].count } 
            : null
        },
        dueContacts,
        recentContacts,
        popularTags: popularTags.map(item => ({ 
          id: item.tag.id,
          name: item.tag.name, 
          count: item.count 
        }))
      };
      
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard data", error });
    }
  });

  // Manually trigger reminders for testing
  app.post("/api/process-reminders", ensureAuthenticated, async (req, res) => {
    try {
      await processReminders();
      res.status(200).json({ message: "Reminders processed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error processing reminders", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
