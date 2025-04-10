import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure a user is authenticated
 * If the user is authenticated, proceeds to the next middleware
 * Otherwise, returns a 401 Unauthorized response
 */
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  console.log("Unauthorized access attempt:", req.url, "User:", req.user);
  res.status(401).send("Unauthorized");
}

/**
 * Middleware to validate resource ownership
 * Takes a function that extracts the owner ID from the resource
 * Compares the owner ID to the current user's ID
 */
export function ensureOwnership<T>(
  resourceFetcher: (id: number) => Promise<T | undefined>,
  ownerIdExtractor: (resource: T) => number
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = parseInt(req.params.id);
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const resource = await resourceFetcher(resourceId);
      
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      
      const ownerId = ownerIdExtractor(resource);
      
      if (ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Attach the resource to the request for later use
      (req as any).resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
}