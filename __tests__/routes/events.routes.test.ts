import supertest from 'supertest';
import { createTestApp } from '../setup';
import { mockStorage, mockUser, mockCalendarEvent } from '../utils';
import eventsRoutes from '../../server/routes/events.routes';

describe('Events Routes', () => {
  const app = createTestApp();
  app.use('/api/events', eventsRoutes);
  
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  describe('GET /api/events', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get('/api/events');
      expect(response.status).toBe(401);
    });
    
    it('should return events for authenticated user', async () => {
      const response = await supertest(app)
        .get('/api/events')
        .set('x-test-auth', 'true');
      
      expect(response.status).toBe(200);
      expect(mockStorage.getCalendarEventsByUserId).toHaveBeenCalledWith(mockUser.id);
    });
  });
  
  describe('GET /api/events/upcoming', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get('/api/events/upcoming');
      expect(response.status).toBe(401);
    });
    
    it('should return upcoming events for authenticated user', async () => {
      const response = await supertest(app)
        .get('/api/events/upcoming')
        .set('x-test-auth', 'true');
      
      expect(response.status).toBe(200);
      expect(mockStorage.getUpcomingEvents).toHaveBeenCalledWith(mockUser.id, 10);
    });
  });
  
  describe('GET /api/events/:id', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get(`/api/events/${mockCalendarEvent.id}`);
      expect(response.status).toBe(401);
    });
    
    it('should return event for authenticated user', async () => {
      // Monkey patch the request to simulate middleware that checks ownership
      const request = supertest(app)
        .get(`/api/events/${mockCalendarEvent.id}`)
        .set('x-test-auth', 'true');
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockCalendarEvent;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCalendarEvent);
    });
  });
  
  describe('POST /api/events', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app)
        .post('/api/events')
        .send({
          title: 'New Event',
          startDate: new Date(),
          endDate: new Date(Date.now() + 3600000),
          contactId: 1
        });
      
      expect(response.status).toBe(401);
    });
    
    it('should create a new event for authenticated user', async () => {
      const newEventData = {
        title: 'New Event',
        startDate: new Date(),
        endDate: new Date(Date.now() + 3600000),
        contactId: 1
      };
      
      const response = await supertest(app)
        .post('/api/events')
        .set('x-test-auth', 'true')
        .send(newEventData);
      
      expect(response.status).toBe(201);
      expect(mockStorage.createCalendarEvent).toHaveBeenCalledWith({
        ...newEventData,
        userId: mockUser.id
      });
    });
  });
  
  describe('PATCH /api/events/:id', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app)
        .patch(`/api/events/${mockCalendarEvent.id}`)
        .send({ title: 'Updated Event' });
      
      expect(response.status).toBe(401);
    });
    
    it('should update an event for authenticated user', async () => {
      const updateData = {
        title: 'Updated Event'
      };
      
      // Monkey patch the request to simulate middleware that checks ownership
      const request = supertest(app)
        .patch(`/api/events/${mockCalendarEvent.id}`)
        .set('x-test-auth', 'true')
        .send(updateData);
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockCalendarEvent;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(200);
      expect(mockStorage.updateCalendarEvent).toHaveBeenCalledWith(
        mockCalendarEvent.id,
        updateData
      );
    });
  });
  
  describe('DELETE /api/events/:id', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).delete(`/api/events/${mockCalendarEvent.id}`);
      expect(response.status).toBe(401);
    });
    
    it('should delete an event for authenticated user', async () => {
      // Monkey patch the request to simulate middleware that checks ownership
      const request = supertest(app)
        .delete(`/api/events/${mockCalendarEvent.id}`)
        .set('x-test-auth', 'true');
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockCalendarEvent;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(204);
      expect(mockStorage.deleteCalendarEvent).toHaveBeenCalledWith(mockCalendarEvent.id);
    });
  });
});