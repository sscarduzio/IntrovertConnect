import supertest from 'supertest';
import { createTestApp } from '../setup';
import { mockStorage, mockUser } from '../utils';
import userRoutes from '../../server/routes/user.routes';

describe('User Routes', () => {
  const app = createTestApp();
  app.use('/api/user', userRoutes);
  
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  describe('GET /api/user', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get('/api/user');
      expect(response.status).toBe(401);
    });
    
    it('should return user data for authenticated user', async () => {
      const response = await supertest(app)
        .get('/api/user')
        .set('x-test-auth', 'true');
      
      expect(response.status).toBe(200);
      // Password should be filtered out
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('id', mockUser.id);
      expect(response.body).toHaveProperty('username', mockUser.username);
    });
  });
  
  describe('POST /api/user/change-password', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app)
        .post('/api/user/change-password')
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword'
        });
      
      expect(response.status).toBe(401);
    });
    
    it('should change password for authenticated user', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword'
      };
      
      // Mock methods
      const mockHashPasswordFn = jest.fn().mockResolvedValue('hashed_new_password');
      const mockComparePasswordsFn = jest.fn().mockResolvedValue(true);
      
      // Monkey patch the auth module's functions
      const authModule = require('../../server/auth');
      const originalHashPassword = authModule.hashPassword;
      const originalComparePasswords = authModule.comparePasswords;
      
      authModule.hashPassword = mockHashPasswordFn;
      authModule.comparePasswords = mockComparePasswordsFn;
      
      try {
        const response = await supertest(app)
          .post('/api/user/change-password')
          .set('x-test-auth', 'true')
          .send(passwordData);
        
        expect(response.status).toBe(200);
        expect(mockComparePasswordsFn).toHaveBeenCalledWith(
          passwordData.currentPassword,
          mockUser.password
        );
        expect(mockHashPasswordFn).toHaveBeenCalledWith(passwordData.newPassword);
        expect(mockStorage.updateUser).toHaveBeenCalledWith(
          mockUser.id,
          { password: 'hashed_new_password' }
        );
      } finally {
        // Restore the original methods
        authModule.hashPassword = originalHashPassword;
        authModule.comparePasswords = originalComparePasswords;
      }
    });
    
    it('should return 401 if current password is incorrect', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword'
      };
      
      // Mock comparePasswords to return false (wrong password)
      const mockComparePasswordsFn = jest.fn().mockResolvedValue(false);
      
      // Monkey patch the auth module
      const authModule = require('../../server/auth');
      const originalComparePasswords = authModule.comparePasswords;
      authModule.comparePasswords = mockComparePasswordsFn;
      
      try {
        const response = await supertest(app)
          .post('/api/user/change-password')
          .set('x-test-auth', 'true')
          .send(passwordData);
        
        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Current password is incorrect');
        expect(mockStorage.updateUser).not.toHaveBeenCalled();
      } finally {
        // Restore the original method
        authModule.comparePasswords = originalComparePasswords;
      }
    });
  });
  
  describe('POST /api/user/test-email', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).post('/api/user/test-email');
      expect(response.status).toBe(401);
    });
    
    it('should send a test email for authenticated user', async () => {
      // Mock the processUserReminders function
      const emailModule = require('../../server/email');
      const originalProcessUserReminders = emailModule.processUserReminders;
      const mockProcessUserReminders = jest.fn().mockResolvedValue(1);
      
      emailModule.processUserReminders = mockProcessUserReminders;
      
      try {
        const response = await supertest(app)
          .post('/api/user/test-email')
          .set('x-test-auth', 'true');
        
        expect(response.status).toBe(200);
        expect(mockProcessUserReminders).toHaveBeenCalledWith(mockUser.id);
        expect(response.body).toEqual({ success: true, emailsSent: 1 });
      } finally {
        // Restore the original method
        emailModule.processUserReminders = originalProcessUserReminders;
      }
    });
  });
});