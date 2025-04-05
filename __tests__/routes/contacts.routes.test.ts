import supertest from 'supertest';
import { createTestApp } from '../setup';
import { mockStorage, mockUser, mockContact, mockContactWithLogsAndTags, mockContactLog } from '../utils';
import contactsRoutes from '../../server/routes/contacts.routes';

describe('Contacts Routes', () => {
  const app = createTestApp();
  app.use('/api/contacts', contactsRoutes);
  
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  describe('GET /api/contacts', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get('/api/contacts');
      expect(response.status).toBe(401);
    });
    
    it('should return contacts for authenticated user', async () => {
      const response = await supertest(app)
        .get('/api/contacts')
        .set('x-test-auth', 'true');
      
      expect(response.status).toBe(200);
      expect(mockStorage.getContactsByUserId).toHaveBeenCalledWith(mockUser.id);
    });
  });
  
  describe('GET /api/contacts/:id', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get(`/api/contacts/${mockContact.id}`);
      expect(response.status).toBe(401);
    });
    
    it('should return contact for authenticated user', async () => {
      // Set up the route to work with ensureOwnership middleware
      // We need to monkey patch the request to simulate middleware behavior
      const request = supertest(app)
        .get(`/api/contacts/${mockContact.id}`)
        .set('x-test-auth', 'true');
      
      // Monkey patch the request to add resource property
      (request as any).end = (origEnd: any) => function(callback: any) {
        // Modify the request to include the resource that the middleware would add
        this.req.resource = mockContactWithLogsAndTags;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContactWithLogsAndTags);
    });
  });
  
  describe('POST /api/contacts', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app)
        .post('/api/contacts')
        .send({
          firstName: 'New',
          lastName: 'Contact',
          email: 'new@example.com'
        });
      
      expect(response.status).toBe(401);
    });
    
    it('should create a new contact for authenticated user', async () => {
      const newContactData = {
        firstName: 'New',
        lastName: 'Contact',
        email: 'new@example.com',
        tags: ['Tag1', 'Tag2']
      };
      
      // Mock getTagByName to return undefined (tag doesn't exist)
      mockStorage.getTagByName.mockResolvedValue(undefined);
      
      const response = await supertest(app)
        .post('/api/contacts')
        .set('x-test-auth', 'true')
        .send(newContactData);
      
      expect(response.status).toBe(201);
      expect(mockStorage.createContact).toHaveBeenCalled();
      
      // Check if tags were processed
      expect(mockStorage.getTagByName).toHaveBeenCalledTimes(2);
      expect(mockStorage.createTag).toHaveBeenCalledTimes(2);
      expect(mockStorage.createContactTag).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('PATCH /api/contacts/:id', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app)
        .patch(`/api/contacts/${mockContact.id}`)
        .send({ firstName: 'Updated' });
      
      expect(response.status).toBe(401);
    });
    
    it('should update a contact for authenticated user', async () => {
      // Set up the route to work with ensureOwnership middleware
      const updateData = {
        firstName: 'Updated',
        tags: ['Tag1']
      };
      
      // Mock getTagByName to return undefined (tag doesn't exist)
      mockStorage.getTagByName.mockResolvedValue(undefined);
      
      // Monkey patch the request to add resource property simulating middleware
      const request = supertest(app)
        .patch(`/api/contacts/${mockContact.id}`)
        .set('x-test-auth', 'true')
        .send(updateData);
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockContactWithLogsAndTags;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(200);
      expect(mockStorage.updateContact).toHaveBeenCalledWith(
        mockContact.id,
        expect.objectContaining({ firstName: 'Updated' })
      );
      
      // Check if tags were processed
      expect(mockStorage.deleteContactTagsByContactId).toHaveBeenCalledWith(mockContact.id);
      expect(mockStorage.getTagByName).toHaveBeenCalledTimes(1);
      expect(mockStorage.createTag).toHaveBeenCalledTimes(1);
      expect(mockStorage.createContactTag).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('DELETE /api/contacts/:id', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).delete(`/api/contacts/${mockContact.id}`);
      expect(response.status).toBe(401);
    });
    
    it('should delete a contact for authenticated user', async () => {
      // Monkey patch the request to add resource property simulating middleware
      const request = supertest(app)
        .delete(`/api/contacts/${mockContact.id}`)
        .set('x-test-auth', 'true');
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockContactWithLogsAndTags;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(204);
      expect(mockStorage.deleteContact).toHaveBeenCalledWith(mockContact.id);
    });
  });
  
  describe('POST /api/contacts/:id/logs', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app)
        .post(`/api/contacts/${mockContact.id}/logs`)
        .send({
          date: new Date(),
          type: 'call',
          notes: 'Test call'
        });
      
      expect(response.status).toBe(401);
    });
    
    it('should create a contact log for authenticated user', async () => {
      const logData = {
        date: new Date(),
        type: 'call',
        notes: 'Test call'
      };
      
      // Monkey patch the request to add resource property simulating middleware
      const request = supertest(app)
        .post(`/api/contacts/${mockContact.id}/logs`)
        .set('x-test-auth', 'true')
        .send(logData);
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockContactWithLogsAndTags;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(201);
      expect(mockStorage.createContactLog).toHaveBeenCalledWith({
        ...logData,
        contactId: mockContact.id
      });
    });
  });
  
  describe('GET /api/contacts/:id/logs', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get(`/api/contacts/${mockContact.id}/logs`);
      expect(response.status).toBe(401);
    });
    
    it('should get contact logs for authenticated user', async () => {
      // Monkey patch the request to add resource property simulating middleware
      const request = supertest(app)
        .get(`/api/contacts/${mockContact.id}/logs`)
        .set('x-test-auth', 'true');
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockContactWithLogsAndTags;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(200);
      expect(mockStorage.getContactLogsByContactId).toHaveBeenCalledWith(mockContact.id);
      expect(response.body).toEqual([mockContactLog]);
    });
  });
  
  describe('GET /api/contacts/:id/events', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get(`/api/contacts/${mockContact.id}/events`);
      expect(response.status).toBe(401);
    });
    
    it('should get contact events for authenticated user', async () => {
      // Monkey patch the request to add resource property simulating middleware
      const request = supertest(app)
        .get(`/api/contacts/${mockContact.id}/events`)
        .set('x-test-auth', 'true');
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockContactWithLogsAndTags;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(200);
      expect(mockStorage.getCalendarEventsByContactId).toHaveBeenCalledWith(mockContact.id);
    });
  });
});