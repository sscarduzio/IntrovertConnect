import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { ensureAuthenticated } from "../middleware/auth";
import { hashPassword, comparePasswords } from "../auth";
import { sendReminderEmail } from "../email";
import { ContactWithTags, users } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

const router = Router();

// Get current user
router.get("/", ensureAuthenticated, (req: Request, res: Response) => {
  res.json(req.user);
});

// Update user password
router.post("/change-password", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const passwordSchema = z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6)
    });
    
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);
    
    // Get current user from database
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Verify current password
    const passwordValid = await comparePasswords(currentPassword, user.password);
    if (!passwordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user in database
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
    
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid password data", errors: error.errors });
    }
    next(error);
  }
});

// Send test email
router.post("/test-email", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Create a simple test contact
    const testContact: ContactWithTags = {
      id: 0,
      userId: user.id,
      firstName: "Test",
      lastName: "Contact",
      email: null,
      phone: null,
      notes: "This is a test reminder email to verify your email settings.",
      lastContactDate: new Date(),
      nextContactDate: new Date(), 
      reminderFrequency: 1,
      relationshipScore: 50,
      contactFrequency: 0,
      contactTrend: "stable",
      lastResponseDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [{ id: 0, name: "Test", userId: user.id, createdAt: new Date() }]
    };
    
    // Send test email
    await sendReminderEmail(testContact, user.email);
    
    res.json({ message: "Test email sent successfully" });
  } catch (error) {
    console.error("Error sending test email:", error);
    next(error);
  }
});

export default router;