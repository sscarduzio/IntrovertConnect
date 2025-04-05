import { Express } from 'express';
import { User, Tag, Contact, ContactLog, CalendarEvent, ContactWithTags, ContactWithLogsAndTags } from '../shared/schema';
import supertest from 'supertest';

// Mock user for testing
export const mockUser: User = {
  id: 999,
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed_password',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock tag for testing
export const mockTag: Tag = {
  id: 999,
  userId: mockUser.id,
  name: 'Test Tag',
  createdAt: new Date()
};

// Mock contact for testing
export const mockContact: Contact = {
  id: 999,
  userId: mockUser.id,
  firstName: 'Test',
  lastName: 'Contact',
  email: 'contact@example.com',
  phone: '123-456-7890',
  notes: 'Test notes',
  lastContactDate: new Date(),
  nextContactDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  reminderFrequency: 7,
  relationshipScore: 50,
  contactFrequency: 1,
  contactTrend: 'stable',
  lastResponseDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock contact with tags
export const mockContactWithTags: ContactWithTags = {
  ...mockContact,
  tags: [mockTag]
};

// Mock contact log
export const mockContactLog: ContactLog = {
  id: 999,
  contactId: mockContact.id,
  date: new Date(),
  type: 'email',
  notes: 'Test log notes',
  createdAt: new Date()
};

// Mock contact with logs and tags
export const mockContactWithLogsAndTags: ContactWithLogsAndTags = {
  ...mockContactWithTags,
  logs: [mockContactLog]
};

// Mock calendar event
export const mockCalendarEvent: CalendarEvent = {
  id: 999,
  userId: mockUser.id,
  contactId: mockContact.id,
  title: 'Test Event',
  description: 'Test event description',
  location: 'Test location',
  startDate: new Date(),
  endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  createdAt: new Date(),
  updatedAt: new Date()
};

// Authenticated request helper
export const authenticatedRequest = (app: Express, user = mockUser) => {
  const agent = supertest.agent(app);
  // Attach the user to the request object for testing purposes
  // This simulates an authenticated session
  (agent as any).attachUser = (req: any) => {
    req.user = user;
    req.isAuthenticated = () => true;
    return req;
  };
  return agent;
};

// Define a mock storage implementation for testing
export const mockStorage = {
  getUser: jest.fn().mockImplementation((id: number) => {
    return id === mockUser.id ? Promise.resolve(mockUser) : Promise.resolve(undefined);
  }),
  getUserByUsername: jest.fn().mockImplementation((username: string) => {
    return username === mockUser.username ? Promise.resolve(mockUser) : Promise.resolve(undefined);
  }),
  getUserByEmail: jest.fn().mockImplementation((email: string) => {
    return email === mockUser.email ? Promise.resolve(mockUser) : Promise.resolve(undefined);
  }),
  createUser: jest.fn().mockImplementation(() => Promise.resolve(mockUser)),
  updateUser: jest.fn().mockImplementation((id: number) => {
    return id === mockUser.id ? Promise.resolve(mockUser) : Promise.resolve(undefined);
  }),
  
  getContactsByUserId: jest.fn().mockImplementation((userId: number) => {
    return userId === mockUser.id ? Promise.resolve([mockContactWithTags]) : Promise.resolve([]);
  }),
  getContactById: jest.fn().mockImplementation((id: number) => {
    return id === mockContact.id ? Promise.resolve(mockContactWithLogsAndTags) : Promise.resolve(undefined);
  }),
  createContact: jest.fn().mockImplementation(() => Promise.resolve(mockContact)),
  updateContact: jest.fn().mockImplementation((id: number) => {
    return id === mockContact.id ? Promise.resolve(mockContact) : Promise.resolve(undefined);
  }),
  deleteContact: jest.fn().mockImplementation(() => Promise.resolve(true)),
  
  getTagsByUserId: jest.fn().mockImplementation((userId: number) => {
    return userId === mockUser.id ? Promise.resolve([mockTag]) : Promise.resolve([]);
  }),
  getTagByName: jest.fn().mockImplementation((name: string, userId: number) => {
    return name === mockTag.name && userId === mockUser.id ? Promise.resolve(mockTag) : Promise.resolve(undefined);
  }),
  createTag: jest.fn().mockImplementation(() => Promise.resolve(mockTag)),
  deleteTag: jest.fn().mockImplementation(() => Promise.resolve(true)),
  
  getContactTagsByContactId: jest.fn().mockImplementation(() => Promise.resolve([{ contactId: mockContact.id, tagId: mockTag.id }])),
  getContactTagsByTagId: jest.fn().mockImplementation(() => Promise.resolve([{ contactId: mockContact.id, tagId: mockTag.id }])),
  createContactTag: jest.fn().mockImplementation(() => Promise.resolve({ contactId: mockContact.id, tagId: mockTag.id })),
  deleteContactTagsByContactId: jest.fn().mockImplementation(() => Promise.resolve(true)),
  
  getContactLogsByContactId: jest.fn().mockImplementation(() => Promise.resolve([mockContactLog])),
  createContactLog: jest.fn().mockImplementation(() => Promise.resolve(mockContactLog)),
  
  getCalendarEventsByUserId: jest.fn().mockImplementation((userId: number) => {
    return userId === mockUser.id ? Promise.resolve([mockCalendarEvent]) : Promise.resolve([]);
  }),
  getCalendarEventsByContactId: jest.fn().mockImplementation((contactId: number) => {
    return contactId === mockContact.id ? Promise.resolve([mockCalendarEvent]) : Promise.resolve([]);
  }),
  getCalendarEvent: jest.fn().mockImplementation((id: number) => {
    return id === mockCalendarEvent.id ? Promise.resolve(mockCalendarEvent) : Promise.resolve(undefined);
  }),
  createCalendarEvent: jest.fn().mockImplementation(() => Promise.resolve(mockCalendarEvent)),
  updateCalendarEvent: jest.fn().mockImplementation((id: number) => {
    return id === mockCalendarEvent.id ? Promise.resolve(mockCalendarEvent) : Promise.resolve(undefined);
  }),
  deleteCalendarEvent: jest.fn().mockImplementation(() => Promise.resolve(true)),
  
  getDueContacts: jest.fn().mockImplementation(() => Promise.resolve([mockContactWithTags])),
  getRecentContacts: jest.fn().mockImplementation(() => Promise.resolve([mockContactWithTags])),
  getPopularTags: jest.fn().mockImplementation(() => Promise.resolve([{ tag: mockTag, count: 1 }])),
  getUpcomingEvents: jest.fn().mockImplementation(() => Promise.resolve([mockCalendarEvent])),
  
  // Mock session store
  sessionStore: {}
};