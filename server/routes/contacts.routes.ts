import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { ensureAuthenticated, ensureOwnership } from "../middleware/auth";
import { extendAndValidate, validateRequest } from "../middleware/validation";
import { 
  insertContactSchema, 
  insertContactTagSchema, 
  insertContactLogSchema
} from "@shared/schema";

const router = Router();

// Get all contacts for the current user
router.get("/", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacts = await storage.getContactsByUserId(req.user!.id);
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

// Get a single contact by ID
router.get(
  "/:id", 
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getContactById(id),
    (contact) => contact.userId
  ),
  async (req: Request, res: Response) => {
    // Contact is already fetched and ownership validated by middleware
    res.json((req as any).resource);
  }
);

// Create a new contact
router.post(
  "/", 
  ensureAuthenticated,
  extendAndValidate(insertContactSchema, (req) => ({ userId: req.user!.id })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contact = await storage.createContact(req.body);
      
      // Handle tags if provided
      if (req.body.tags && Array.isArray(req.body.tags) && req.body.tags.length > 0) {
        for (const tagName of req.body.tags) {
          // Check if tag exists already
          let tag = await storage.getTagByName(tagName, req.user!.id);
          
          // Create tag if it doesn't exist
          if (!tag) {
            tag = await storage.createTag({ name: tagName, userId: req.user!.id });
          }
          
          // Create contact-tag association
          await storage.createContactTag({
            contactId: contact.id,
            tagId: tag.id
          });
        }
      }
      
      // Return the complete contact with tags
      const contactWithTags = await storage.getContactById(contact.id);
      res.status(201).json(contactWithTags);
    } catch (error) {
      next(error);
    }
  }
);

// Update a contact
router.patch(
  "/:id",
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getContactById(id),
    (contact) => contact.userId
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Validate partial update data
      const validated = insertContactSchema.partial().parse(req.body);
      
      // Update contact
      const updatedContact = await storage.updateContact(contactId, validated);
      
      // Handle tags if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        // Remove existing tags
        await storage.deleteContactTagsByContactId(contactId);
        
        // Add new tags
        for (const tagName of req.body.tags) {
          // Check if tag exists already
          let tag = await storage.getTagByName(tagName, req.user!.id);
          
          // Create tag if it doesn't exist
          if (!tag) {
            tag = await storage.createTag({ name: tagName, userId: req.user!.id });
          }
          
          // Create contact-tag association
          await storage.createContactTag({
            contactId: contactId,
            tagId: tag.id
          });
        }
      }
      
      // Return the complete contact with tags
      const contactWithTags = await storage.getContactById(contactId);
      res.json(contactWithTags);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      next(error);
    }
  }
);

// Delete a contact
router.delete(
  "/:id",
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getContactById(id),
    (contact) => contact.userId
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contactId = parseInt(req.params.id);
      await storage.deleteContact(contactId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Add a contact log
router.post(
  "/:id/logs",
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getContactById(id),
    (contact) => contact.userId
  ),
  validateRequest(insertContactLogSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Create contact log
      const contactLog = await storage.createContactLog({
        ...req.body,
        contactId,
      });
      
      res.status(201).json(contactLog);
    } catch (error) {
      next(error);
    }
  }
);

// Get logs for a contact
router.get(
  "/:id/logs",
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getContactById(id),
    (contact) => contact.userId
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contactId = parseInt(req.params.id);
      const logs = await storage.getContactLogsByContactId(contactId);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  }
);

// Get events for a contact
router.get(
  "/:id/events",
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getContactById(id),
    (contact) => contact.userId
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contactId = parseInt(req.params.id);
      const events = await storage.getCalendarEventsByContactId(contactId);
      res.json(events);
    } catch (error) {
      next(error);
    }
  }
);

export default router;