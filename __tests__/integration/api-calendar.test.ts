/**
 * Tests d'intégration pour l'API Calendar
 */

import { POST as createEvent, GET as getEvents } from '@/app/api/calendar/events/route';
import { NextRequest } from 'next/server';
import prisma from '@/app/lib/prisma';
import { hash } from 'bcrypt';

describe('API Calendar - Intégration', () => {
  let testUser: { id: string; email: string };
  let mockRequest: NextRequest;

  beforeAll(async () => {
    // Créer un utilisateur de test
    const hashedPassword = await hash('testpassword', 10);
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Test User',
      },
    });
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await prisma.calendarEvent.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Mock NextRequest avec headers d'authentification
    mockRequest = {
      headers: new Headers({
        'content-type': 'application/json',
      }),
      json: jest.fn(),
    } as unknown as NextRequest;
  });

  describe('POST /api/calendar/events', () => {
    it('devrait créer un événement avec des données valides', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        start: new Date('2025-12-25T10:00:00Z').toISOString(),
        end: new Date('2025-12-25T11:00:00Z').toISOString(),
        location: 'Test Location',
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(eventData);

      // Mock requireUser pour retourner testUser
      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await createEvent(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('event');
      expect(data.event.title).toBe(eventData.title);
      expect(data.event.description).toBe(eventData.description);
    });

    it('devrait rejeter un événement sans titre', async () => {
      const eventData = {
        description: 'Test Description',
        start: new Date('2025-12-25T10:00:00Z').toISOString(),
        end: new Date('2025-12-25T11:00:00Z').toISOString(),
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(eventData);

      const response = await createEvent(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('devrait rejeter un événement avec des dates invalides', async () => {
      const eventData = {
        title: 'Test Event',
        start: new Date('2025-12-25T11:00:00Z').toISOString(),
        end: new Date('2025-12-25T10:00:00Z').toISOString(), // End avant start
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(eventData);

      const response = await createEvent(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/calendar/events', () => {
    it('devrait récupérer les événements de l\'utilisateur', async () => {
      // Créer un événement de test
      await prisma.calendarEvent.create({
        data: {
          userId: testUser.id,
          title: 'Test Event for GET',
          description: 'Test',
          start: new Date('2025-12-25T10:00:00Z'),
          end: new Date('2025-12-25T11:00:00Z'),
        },
      });

      // Mock requireUser
      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await getEvents(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('events');
      expect(Array.isArray(data.events)).toBe(true);
    });
  });
});






