import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { ensureAuthenticated } from "../middleware/auth";

const router = Router();

// Get dashboard data
router.get("/", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dueContacts = await storage.getDueContacts(req.user!.id);
    const recentContacts = await storage.getRecentContacts(req.user!.id, 5);
    const popularTags = await storage.getPopularTags(req.user!.id, 10);
    const upcomingEvents = await storage.getUpcomingEvents(req.user!.id, 5);
    
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
      upcomingEvents,
      popularTags: popularTags.map(item => ({ 
        id: item.tag.id,
        name: item.tag.name, 
        count: item.count 
      }))
    };
    
    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
});

export default router;