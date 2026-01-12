// app/lib/prisma-types.ts
// Types stub temporaires pour remplacer @prisma/client
// À supprimer une fois la migration Supabase complète

// TODO: Remplacer tous les imports de @prisma/client par @/app/lib/supabase/types

export type Task = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  context: string;
  completed: boolean;
  due?: Date | null;
  [key: string]: any;
};

export type Routine = {
  id: string;
  userId: string;
  name: string;
  active: boolean;
  triggerType: string;
  [key: string]: any;
};

export type RoutineLog = {
  id: string;
  routineId: string;
  executedAt: Date;
  status: string;
  [key: string]: any;
};

export type CalendarEvent = {
  id: string;
  userId: string;
  title: string;
  start: Date;
  end: Date;
  [key: string]: any;
};

export type Reminder = {
  id: string;
  userId: string;
  title: string;
  scheduledFor: Date;
  status: string;
  [key: string]: any;
};

export type Device = {
  id: string;
  userId: string;
  name: string;
  type: string;
  [key: string]: any;
};

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";
export type TaskContext = string;
export type Prisma = any;

export type UserActivity = {
  id: string;
  userId: string;
  activityType: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: any;
  createdAt: Date;
  [key: string]: any;
};

// Ajoutez d'autres types selon vos besoins

