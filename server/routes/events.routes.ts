import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { ensureAuthenticated, ensureOwnership } from "../middleware/auth";
import { extendAndValidate } from "../middleware/validation";
import { insertCalendarEventSchema } from "@shared/schema";

const router = Router();

// Get all events for the current user
router.get("/", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await storage.getCalendarEventsByUserId(req.user!.id);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Get upcoming events
router.get("/upcoming", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const events = await storage.getUpcomingEvents(req.user!.id, limit);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Get a single event by ID
router.get(
  "/:id", 
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getCalendarEvent(id),
    (event) => event.userId
  ),
  async (req: Request, res: Response) => {
    // Event is already fetched and ownership validated by middleware
    res.json((req as any).resource);
  }
);

// Create a new event
router.post(
  "/", 
  ensureAuthenticated,
  extendAndValidate(insertCalendarEventSchema, (req) => ({ userId: req.user!.id })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if contact exists and belongs to user
      const existingContact = await storage.getContactById(req.body.contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      if (existingContact.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const event = await storage.createCalendarEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }
);

// Update an event
router.patch(
  "/:id",
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getCalendarEvent(id),
    (event) => event.userId
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = parseInt(req.params.id);
      const existingEvent = (req as any).resource;
      
      // Validate partial update data
      const validated = insertCalendarEventSchema.partial().parse(req.body);
      
      // If contactId is being updated, check if the new contact exists and belongs to user
      if (validated.contactId && validated.contactId !== existingEvent.contactId) {
        const existingContact = await storage.getContactById(validated.contactId);
        if (!existingContact) {
          return res.status(404).json({ message: "Contact not found" });
        }
        
        if (existingContact.userId !== req.user!.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const updatedEvent = await storage.updateCalendarEvent(eventId, validated);
      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      next(error);
    }
  }
);

// Delete an event
router.delete(
  "/:id",
  ensureAuthenticated,
  ensureOwnership(
    (id) => storage.getCalendarEvent(id),
    (event) => event.userId
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = parseInt(req.params.id);
      await storage.deleteCalendarEvent(eventId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;