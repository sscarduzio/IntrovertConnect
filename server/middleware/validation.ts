import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

/**
 * Creates a middleware that validates the request body against a Zod schema
 * If validation passes, proceeds to the next middleware
 * Otherwise, returns a 400 Bad Request response with validation errors
 */
export function validateRequest(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      return next(error);
    }
  };
}

/**
 * Creates a middleware that extends the request body with additional properties
 * and then validates it against a Zod schema
 */
export function extendAndValidate(schema: AnyZodObject, extender: (req: Request) => Record<string, any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const extended = {
        ...req.body,
        ...extender(req)
      };
      
      // Validate the extended request body
      const validated = await schema.parseAsync(extended);
      
      // Replace the request body with the validated data
      req.body = validated;
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      return next(error);
    }
  };
}