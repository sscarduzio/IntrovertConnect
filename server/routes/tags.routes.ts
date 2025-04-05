import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { ensureAuthenticated } from "../middleware/auth";
import { extendAndValidate } from "../middleware/validation";
import { insertTagSchema } from "@shared/schema";

const router = Router();

// Get all tags for the current user
router.get("/", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await storage.getTagsByUserId(req.user!.id);
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

// Create a new tag
router.post(
  "/", 
  ensureAuthenticated,
  extendAndValidate(insertTagSchema, (req) => ({ userId: req.user!.id })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if tag already exists
      const existingTag = await storage.getTagByName(req.body.name, req.user!.id);
      if (existingTag) {
        return res.status(400).json({ message: "Tag already exists" });
      }
      
      const tag = await storage.createTag(req.body);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a tag
router.delete("/:id", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tagId = parseInt(req.params.id);
    
    // Check if tag exists and belongs to user
    const tags = await storage.getTagsByUserId(req.user!.id);
    const tag = tags.find(t => t.id === tagId);
    
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }
    
    await storage.deleteTag(tagId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;