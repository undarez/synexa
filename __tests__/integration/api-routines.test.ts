/**
 * Tests d'intégration pour l'API Routines
 */

import { POST as createRoutine, GET as getRoutines } from '@/app/api/routines/route';
import { NextRequest } from 'next/server';
import prisma from '@/app/lib/prisma';
import { hash } from 'bcrypt';

describe('API Routines - Intégration', () => {
  let testUser: { id: string; email: string };
  let mockRequest: NextRequest;

  beforeAll(async () => {
    const hashedPassword = await hash('testpassword', 10);
    const createdUser = await prisma.user.create({
      data: {
        email: `test-routine-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Test User',
      },
    });
    if (!createdUser.email) {
      throw new Error('User email is null');
    }
    testUser = {
      id: createdUser.id,
      email: createdUser.email,
    };
  });

  afterAll(async () => {
    await prisma.routine.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    mockRequest = {
      headers: new Headers({
        'content-type': 'application/json',
      }),
      json: jest.fn(),
    } as unknown as NextRequest;
  });

  describe('POST /api/routines', () => {
    it('devrait créer une routine avec un trigger SCHEDULE', async () => {
      const routineData = {
        name: 'Test Routine',
        description: 'Test Description',
        active: true,
        triggerType: 'SCHEDULE',
        triggerData: {
          time: '08:00',
          days: ['monday', 'tuesday', 'wednesday'],
        },
        steps: [
          {
            actionType: 'NOTIFICATION',
            payload: {
              message: 'Bonjour !',
            },
          },
        ],
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(routineData);

      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await createRoutine(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('routine');
      expect(data.routine.name).toBe(routineData.name);
      expect(data.routine.triggerType).toBe('SCHEDULE');
    });

    it('devrait créer une routine avec un trigger VOICE', async () => {
      const routineData = {
        name: 'Voice Routine',
        description: 'Test Voice',
        active: true,
        triggerType: 'VOICE',
        triggerData: {
          command: 'bonjour',
        },
        steps: [
          {
            actionType: 'NOTIFICATION',
            payload: {
              message: 'Bonjour !',
            },
          },
        ],
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(routineData);

      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await createRoutine(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.routine.triggerType).toBe('VOICE');
      expect(data.routine.triggerData.command).toBe('bonjour');
    });

    it('devrait rejeter une routine sans nom', async () => {
      const routineData = {
        description: 'Test',
        active: true,
        triggerType: 'SCHEDULE',
        triggerData: {},
        steps: [],
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(routineData);

      const response = await createRoutine(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/routines', () => {
    it('devrait récupérer les routines de l\'utilisateur', async () => {
      await prisma.routine.create({
        data: {
          userId: testUser.id,
          name: 'Test Routine for GET',
          description: 'Test',
          active: true,
          triggerType: 'MANUAL',
          triggerData: {},
        },
      });

      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await getRoutines();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('routines');
      expect(Array.isArray(data.routines)).toBe(true);
    });
  });
});






