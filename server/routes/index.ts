import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "../auth";

// Import all route modules
import contactsRoutes from "./contacts.routes";
import tagsRoutes from "./tags.routes";
import eventsRoutes from "./events.routes";
import dashboardRoutes from "./dashboard.routes";
import remindersRoutes from "./reminders.routes";
import userRoutes from "./user.routes";

/**
 * Registers all API routes with the Express app
 * @param app Express application instance
 * @returns HTTP server instance
 */
export function registerRoutes(app: Express): Server {
  // Set up authentication first
  setupAuth(app);
  
  // Register all route modules with their respective prefixes
  app.use("/api/contacts", contactsRoutes);
  app.use("/api/tags", tagsRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/reminders", remindersRoutes);
  app.use("/api/user", userRoutes);
  
  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}