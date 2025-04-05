import express, { Express, Request, Response, NextFunction } from 'express';
import { mockStorage, mockUser } from './utils';

// Mock the server/storage.ts module
jest.mock('../server/storage', () => ({
  storage: mockStorage
}));

// Create a test Express app with middleware to support authentication simulation
export function createTestApp(): Express {
  const app = express();
  
  // Add JSON body parser
  app.use(express.json());
  
  // Middleware to handle the x-test-auth header for test authentication
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-test-auth'] === 'true') {
      // Simulate authentication for tests
      req.user = mockUser;
      req.isAuthenticated = () => true;
    } else {
      // Simulate unauthenticated state
      req.isAuthenticated = () => false;
    }
    next();
  });
  
  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Test Server Error:', err);
    res.status(500).json({ message: err.message });
  });
  
  return app;
}

// Global setup before all tests
beforeAll(() => {
  // Silence console output during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Global teardown after all tests
afterAll(() => {
  // Restore console functionality
  jest.restoreAllMocks();
});