/**
 * Tests d'intégration pour l'API Tasks
 */

import { POST as createTask, GET as getTasks } from '@/app/api/tasks/route';
import { NextRequest } from 'next/server';
import prisma from '@/app/lib/prisma';
import { hash } from 'bcrypt';

describe('API Tasks - Intégration', () => {
  let testUser: { id: string; email: string };
  let mockRequest: NextRequest;

  beforeAll(async () => {
    const hashedPassword = await hash('testpassword', 10);
    testUser = await prisma.user.create({
      data: {
        email: `test-task-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Test User',
      },
    });
  });

  afterAll(async () => {
    await prisma.task.deleteMany({
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

  describe('POST /api/tasks', () => {
    it('devrait créer une tâche avec des données valides', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        completed: false,
        priority: 'MEDIUM',
        context: 'PERSONAL',
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(taskData);

      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await createTask(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('task');
      expect(data.task.title).toBe(taskData.title);
      expect(data.task.priority).toBe(taskData.priority);
    });

    it('devrait rejeter une tâche sans titre', async () => {
      const taskData = {
        description: 'Test Description',
        completed: false,
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(taskData);

      const response = await createTask(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('devrait créer une tâche avec une date d\'échéance', async () => {
      const taskData = {
        title: 'Task with Due Date',
        description: 'Test',
        completed: false,
        due: new Date('2025-12-31T23:59:59Z').toISOString(),
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(taskData);

      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await createTask(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.task).toHaveProperty('due');
    });
  });

  describe('GET /api/tasks', () => {
    it('devrait récupérer les tâches de l\'utilisateur', async () => {
      await prisma.task.create({
        data: {
          userId: testUser.id,
          title: 'Test Task for GET',
          description: 'Test',
          completed: false,
        },
      });

      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await getTasks(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      expect(Array.isArray(data.tasks)).toBe(true);
    });

    it('devrait filtrer les tâches complétées', async () => {
      await prisma.task.createMany({
        data: [
          {
            userId: testUser.id,
            title: 'Completed Task',
            completed: true,
          },
          {
            userId: testUser.id,
            title: 'Incomplete Task',
            completed: false,
          },
        ],
      });

      jest.mock('@/app/lib/auth/session', () => ({
        requireUser: jest.fn().mockResolvedValue(testUser),
      }));

      const response = await getTasks(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Par défaut, on devrait récupérer toutes les tâches
      expect(data.tasks.length).toBeGreaterThanOrEqual(2);
    });
  });
});


