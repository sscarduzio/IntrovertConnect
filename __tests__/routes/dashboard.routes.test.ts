import supertest from 'supertest';
import { createTestApp } from '../setup';
import { mockStorage, mockUser, mockContactWithTags, mockTag, mockCalendarEvent } from '../utils';
import dashboardRoutes from '../../server/routes/dashboard.routes';

describe('Dashboard Routes', () => {
  const app = createTestApp();
  app.use('/api/dashboard', dashboardRoutes);
  
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  describe('GET /api/dashboard', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get('/api/dashboard');
      expect(response.status).toBe(401);
    });
    
    it('should return dashboard data for authenticated user', async () => {
      // Set up the mock implementations specifically for this test
      mockStorage.getContactsByUserId.mockResolvedValueOnce([mockContactWithTags, mockContactWithTags]);
      mockStorage.getDueContacts.mockResolvedValueOnce([mockContactWithTags]);
      mockStorage.getRecentContacts.mockResolvedValueOnce([mockContactWithTags]);
      mockStorage.getPopularTags.mockResolvedValueOnce([{tag: mockTag, count: 5}]);
      mockStorage.getUpcomingEvents.mockResolvedValueOnce([mockCalendarEvent]);
      
      const response = await supertest(app)
        .get('/api/dashboard')
        .set('x-test-auth', 'true');
      
      expect(response.status).toBe(200);
      
      // Verify all required dashboard data methods were called
      expect(mockStorage.getContactsByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(mockStorage.getDueContacts).toHaveBeenCalledWith(mockUser.id);
      expect(mockStorage.getRecentContacts).toHaveBeenCalledWith(mockUser.id, 5);
      expect(mockStorage.getPopularTags).toHaveBeenCalledWith(mockUser.id, 5);
      expect(mockStorage.getUpcomingEvents).toHaveBeenCalledWith(mockUser.id, 5);
      
      // Verify response structure
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('dueContacts');
      expect(response.body).toHaveProperty('recentContacts');
      expect(response.body).toHaveProperty('popularTags');
      expect(response.body).toHaveProperty('upcomingEvents');
      
      // Verify stats calculations
      expect(response.body.stats).toHaveProperty('totalContacts', 2);
      expect(response.body.stats).toHaveProperty('dueContacts', 1);
      
      // Verify the dashboard components
      expect(response.body.dueContacts).toEqual([mockContactWithTags]);
      expect(response.body.recentContacts).toEqual([mockContactWithTags]);
      expect(response.body.popularTags).toEqual([{tag: mockTag, count: 5}]);
      expect(response.body.upcomingEvents).toEqual([mockCalendarEvent]);
    });
  });
});