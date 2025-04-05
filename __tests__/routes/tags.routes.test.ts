import supertest from 'supertest';
import { createTestApp } from '../setup';
import { mockStorage, mockUser, mockTag } from '../utils';
import tagsRoutes from '../../server/routes/tags.routes';

describe('Tags Routes', () => {
  const app = createTestApp();
  app.use('/api/tags', tagsRoutes);
  
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  describe('GET /api/tags', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).get('/api/tags');
      expect(response.status).toBe(401);
    });
    
    it('should return tags for authenticated user', async () => {
      const response = await supertest(app)
        .get('/api/tags')
        .set('x-test-auth', 'true');
      
      expect(response.status).toBe(200);
      expect(mockStorage.getTagsByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(response.body).toEqual([mockTag]);
    });
  });
  
  describe('POST /api/tags', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app)
        .post('/api/tags')
        .send({ name: 'New Tag' });
      
      expect(response.status).toBe(401);
    });
    
    it('should create a new tag for authenticated user', async () => {
      const newTagData = { name: 'New Tag' };
      
      const response = await supertest(app)
        .post('/api/tags')
        .set('x-test-auth', 'true')
        .send(newTagData);
      
      expect(response.status).toBe(201);
      expect(mockStorage.createTag).toHaveBeenCalledWith({
        name: newTagData.name,
        userId: mockUser.id
      });
    });
    
    it('should return 400 when tag name is empty', async () => {
      const response = await supertest(app)
        .post('/api/tags')
        .set('x-test-auth', 'true')
        .send({ name: '' });
      
      expect(response.status).toBe(400);
      expect(mockStorage.createTag).not.toHaveBeenCalled();
    });
    
    it('should return 409 when tag already exists', async () => {
      // Mock getTagByName to return an existing tag
      mockStorage.getTagByName.mockResolvedValueOnce(mockTag);
      
      const response = await supertest(app)
        .post('/api/tags')
        .set('x-test-auth', 'true')
        .send({ name: mockTag.name });
      
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
      expect(mockStorage.createTag).not.toHaveBeenCalled();
    });
  });
  
  describe('DELETE /api/tags/:id', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await supertest(app).delete(`/api/tags/${mockTag.id}`);
      expect(response.status).toBe(401);
    });
    
    it('should delete a tag for authenticated user', async () => {
      // We need to monkey patch the request to add the resource property
      // that would be set by the ensureOwnership middleware
      const request = supertest(app)
        .delete(`/api/tags/${mockTag.id}`)
        .set('x-test-auth', 'true');
      
      (request as any).end = (origEnd: any) => function(callback: any) {
        this.req.resource = mockTag;
        return origEnd.call(this, callback);
      }((request as any).end);
      
      const response = await request;
      
      expect(response.status).toBe(204);
      expect(mockStorage.deleteTag).toHaveBeenCalledWith(mockTag.id);
    });
  });
});