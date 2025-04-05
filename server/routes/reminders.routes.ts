import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { ensureAuthenticated } from "../middleware/auth";
import { processReminders, processUserReminders } from "../email";

const router = Router();

// Get reminders status
router.get("/status", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacts = await storage.getDueContacts(req.user!.id);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count overdue, due today, and upcoming reminders
    const overdueCount = contacts.filter(c => {
      if (!c.nextContactDate) return false;
      const date = new Date(c.nextContactDate);
      date.setHours(0, 0, 0, 0);
      return date < today;
    }).length;
    
    const dueTodayCount = contacts.filter(c => {
      if (!c.nextContactDate) return false;
      const date = new Date(c.nextContactDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    }).length;
    
    const upcomingCount = contacts.filter(c => {
      if (!c.nextContactDate) return false;
      const date = new Date(c.nextContactDate);
      date.setHours(0, 0, 0, 0);
      return date > today;
    }).length;
    
    res.json({
      total: contacts.length,
      overdue: overdueCount,
      dueToday: dueTodayCount,
      upcoming: upcomingCount
    });
  } catch (error) {
    next(error);
  }
});

// Process all reminders
router.post("/process", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await processReminders();
    res.status(200).json({ message: "Reminders processed successfully" });
  } catch (error) {
    next(error);
  }
});

// Process reminders for the current user
router.post("/user", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminderCount = await processUserReminders(req.user!.id);
    
    res.status(200).json({ 
      message: `Reminders processed successfully`,
      count: reminderCount 
    });
  } catch (error) {
    next(error);
  }
});

export default router;