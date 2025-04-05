import supertest from 'supertest';
import { createTestApp } from '../setup';
import { mockUser } from '../utils';
import remindersRoutes from '../../server/routes/reminders.routes';

describe('Reminders Routes', () => {
  const app = createTestApp();
  app.use('/api/reminders', remindersRoutes);
  
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  describe('GET /api/reminders/status', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get('/api/reminders/status');
      expect(response.status).toBe(401);
    });
    
    it('should return reminder status for authenticated user', async () => {
      // Mock the hasReminderServiceSetup function
      const emailModule = require('../../server/email');
      const mockServiceSetup = jest.fn().mockResolvedValue(true);
      
      // Store original if it exists, otherwise define it
      const originalFn = emailModule.hasReminderServiceSetup || (() => {});
      
      emailModule.hasReminderServiceSetup = mockServiceSetup;
      
      try {
        const response = await supertest(app)
          .get('/api/reminders/status')
          .set('x-test-auth', 'true');
        
        expect(response.status).toBe(200);
        expect(mockServiceSetup).toHaveBeenCalled();
        expect(response.body).toEqual({ enabled: true });
      } finally {
        // Restore the original function or delete if newly defined
        if (originalFn === (() => {})) {
          delete emailModule.hasReminderServiceSetup;
        } else {
          emailModule.hasReminderServiceSetup = originalFn;
        }
      }
    });
  });
  
  describe('POST /api/reminders/process', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).post('/api/reminders/process');
      expect(response.status).toBe(401);
    });
    
    it('should process reminders for authenticated admin user', async () => {
      // Mock the processReminders function
      const emailModule = require('../../server/email');
      const originalProcessReminders = emailModule.processReminders || (() => {});
      const mockProcessReminders = jest.fn().mockResolvedValue(5);
      
      emailModule.processReminders = mockProcessReminders;
      
      // Create admin user for this test
      const adminUser = { ...mockUser, isAdmin: true };
      
      try {
        // Monkey patch the request to make the user an admin
        const request = supertest(app)
          .post('/api/reminders/process')
          .set('x-test-auth', 'true');
        
        (request as any).end = (origEnd: any) => function(callback: any) {
          this.req.user = adminUser;
          return origEnd.call(this, callback);
        }((request as any).end);
        
        const response = await request;
        
        expect(response.status).toBe(200);
        expect(mockProcessReminders).toHaveBeenCalled();
        expect(response.body).toEqual({ success: true, emailsSent: 5 });
      } finally {
        // Restore the original function
        if (originalProcessReminders === (() => {})) {
          delete emailModule.processReminders;
        } else {
          emailModule.processReminders = originalProcessReminders;
        }
      }
    });
    
    it('should return 403 when user is not an admin', async () => {
      const response = await supertest(app)
        .post('/api/reminders/process')
        .set('x-test-auth', 'true');
      
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Admin access required');
    });
  });
  
  describe('POST /api/reminders/user', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).post('/api/reminders/user');
      expect(response.status).toBe(401);
    });
    
    it('should process reminders for the authenticated user', async () => {
      // Mock the processUserReminders function
      const emailModule = require('../../server/email');
      const originalProcessUserReminders = emailModule.processUserReminders || (() => {});
      const mockProcessUserReminders = jest.fn().mockResolvedValue(2);
      
      emailModule.processUserReminders = mockProcessUserReminders;
      
      try {
        const response = await supertest(app)
          .post('/api/reminders/user')
          .set('x-test-auth', 'true');
        
        expect(response.status).toBe(200);
        expect(mockProcessUserReminders).toHaveBeenCalledWith(mockUser.id);
        expect(response.body).toEqual({ success: true, emailsSent: 2 });
      } finally {
        // Restore the original function
        if (originalProcessUserReminders === (() => {})) {
          delete emailModule.processUserReminders;
        } else {
          emailModule.processUserReminders = originalProcessUserReminders;
        }
      }
    });
  });
});