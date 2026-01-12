// app/lib/supabase/types.ts
// Types TypeScript pour Supabase (générés depuis le schema SQL)

// Enums
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskContext = 'WORK' | 'PERSONAL' | 'SHOPPING' | 'HEALTH' | 'FINANCE' | 'HOME' | 'SOCIAL' | 'LEARNING' | 'OTHER';
export type EnergyLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type CalendarSource = 'GOOGLE' | 'OUTLOOK' | 'ICLOUD' | 'LOCAL' | 'OTHER';
export const CalendarSource = {
  GOOGLE: 'GOOGLE' as CalendarSource,
  OUTLOOK: 'OUTLOOK' as CalendarSource,
  ICLOUD: 'ICLOUD' as CalendarSource,
  LOCAL: 'LOCAL' as CalendarSource,
  OTHER: 'OTHER' as CalendarSource,
} as const;

export type RoutineTriggerType = 'VOICE' | 'SCHEDULE' | 'LOCATION' | 'MANUAL' | 'SENSOR';
export const RoutineTriggerType = {
  VOICE: 'VOICE' as RoutineTriggerType,
  SCHEDULE: 'SCHEDULE' as RoutineTriggerType,
  LOCATION: 'LOCATION' as RoutineTriggerType,
  MANUAL: 'MANUAL' as RoutineTriggerType,
  SENSOR: 'SENSOR' as RoutineTriggerType,
} as const;

export type DeviceType = 'LIGHT' | 'THERMOSTAT' | 'MEDIA' | 'OUTLET' | 'SENSOR' | 'CAMERA' | 'MOTION_DETECTOR' | 'SMOKE_DETECTOR' | 'DOOR_SENSOR' | 'WINDOW_SENSOR' | 'ALARM' | 'OTHER';
export const DeviceType = {
  LIGHT: 'LIGHT' as DeviceType,
  THERMOSTAT: 'THERMOSTAT' as DeviceType,
  MEDIA: 'MEDIA' as DeviceType,
  OUTLET: 'OUTLET' as DeviceType,
  SENSOR: 'SENSOR' as DeviceType,
  CAMERA: 'CAMERA' as DeviceType,
  MOTION_DETECTOR: 'MOTION_DETECTOR' as DeviceType,
  SMOKE_DETECTOR: 'SMOKE_DETECTOR' as DeviceType,
  DOOR_SENSOR: 'DOOR_SENSOR' as DeviceType,
  WINDOW_SENSOR: 'WINDOW_SENSOR' as DeviceType,
  ALARM: 'ALARM' as DeviceType,
  OTHER: 'OTHER' as DeviceType,
} as const;

export type RoutineActionType = 'DEVICE_COMMAND' | 'NOTIFICATION' | 'TASK_CREATE' | 'MEDIA_PLAY' | 'CUSTOM';
export const RoutineActionType = {
  DEVICE_COMMAND: 'DEVICE_COMMAND' as RoutineActionType,
  NOTIFICATION: 'NOTIFICATION' as RoutineActionType,
  TASK_CREATE: 'TASK_CREATE' as RoutineActionType,
  MEDIA_PLAY: 'MEDIA_PLAY' as RoutineActionType,
  CUSTOM: 'CUSTOM' as RoutineActionType,
} as const;
export type ReminderType = 'PUSH' | 'EMAIL' | 'SMS';
export const ReminderType = {
  PUSH: 'PUSH' as ReminderType,
  EMAIL: 'EMAIL' as ReminderType,
  SMS: 'SMS' as ReminderType,
} as const;

export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
export const ReminderStatus = {
  PENDING: 'PENDING' as ReminderStatus,
  SENT: 'SENT' as ReminderStatus,
  FAILED: 'FAILED' as ReminderStatus,
  CANCELLED: 'CANCELLED' as ReminderStatus,
} as const;
export type HealthMetricType = 'SLEEP' | 'ACTIVITY' | 'HEART_RATE' | 'WEIGHT' | 'STEPS' | 'CALORIES' | 'HYDRATION' | 'MOOD' | 'STRESS' | 'BLOOD_PRESSURE' | 'OTHER';
export type BillCategory = 'UTILITIES' | 'INTERNET' | 'INSURANCE' | 'SUBSCRIPTION' | 'RENT' | 'TAXES' | 'HEALTH' | 'TRANSPORT' | 'EDUCATION' | 'OTHER';
export const BillCategory = {
  UTILITIES: 'UTILITIES' as BillCategory,
  INTERNET: 'INTERNET' as BillCategory,
  INSURANCE: 'INSURANCE' as BillCategory,
  SUBSCRIPTION: 'SUBSCRIPTION' as BillCategory,
  RENT: 'RENT' as BillCategory,
  TAXES: 'TAXES' as BillCategory,
  HEALTH: 'HEALTH' as BillCategory,
  TRANSPORT: 'TRANSPORT' as BillCategory,
  EDUCATION: 'EDUCATION' as BillCategory,
  OTHER: 'OTHER' as BillCategory,
} as const;

export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export const BillStatus = {
  PENDING: 'PENDING' as BillStatus,
  PAID: 'PAID' as BillStatus,
  OVERDUE: 'OVERDUE' as BillStatus,
  CANCELLED: 'CANCELLED' as BillStatus,
} as const;
export type ExpenseCategory = 'FOOD' | 'TRANSPORT' | 'SHOPPING' | 'ENTERTAINMENT' | 'HEALTH' | 'EDUCATION' | 'CLOTHING' | 'HOME' | 'PERSONAL' | 'OTHER';
export const ExpenseCategory = {
  FOOD: 'FOOD' as ExpenseCategory,
  TRANSPORT: 'TRANSPORT' as ExpenseCategory,
  SHOPPING: 'SHOPPING' as ExpenseCategory,
  ENTERTAINMENT: 'ENTERTAINMENT' as ExpenseCategory,
  HEALTH: 'HEALTH' as ExpenseCategory,
  EDUCATION: 'EDUCATION' as ExpenseCategory,
  CLOTHING: 'CLOTHING' as ExpenseCategory,
  HOME: 'HOME' as ExpenseCategory,
  PERSONAL: 'PERSONAL' as ExpenseCategory,
  OTHER: 'OTHER' as ExpenseCategory,
} as const;

export type ExpenseFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME';
export const ExpenseFrequency = {
  DAILY: 'DAILY' as ExpenseFrequency,
  WEEKLY: 'WEEKLY' as ExpenseFrequency,
  MONTHLY: 'MONTHLY' as ExpenseFrequency,
  ONE_TIME: 'ONE_TIME' as ExpenseFrequency,
} as const;
export type SecurityDeviceType = 'CAMERA' | 'MOTION_DETECTOR' | 'SMOKE_DETECTOR' | 'DOOR_SENSOR' | 'WINDOW_SENSOR' | 'ALARM' | 'GAS_DETECTOR' | 'WATER_LEAK_DETECTOR' | 'GLASS_BREAK_DETECTOR';
export type SecurityProvider = 'TUYA' | 'ZIGBEE' | 'SONOFF' | 'RTSP' | 'ONVIF' | 'EZVIZ' | 'NETATMO' | 'SOMFY' | 'LEGRAND' | 'OTHER';
export type SecurityDeviceStatus = 'ONLINE' | 'OFFLINE' | 'ALARM' | 'TRIGGERED' | 'DISARMED';

// Types de base pour les tables principales
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  password?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  userCode?: string | null;
  pseudo?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  homeAddress?: string | null;
  workAddress?: string | null;
  workLat?: number | null;
  workLng?: number | null;
  wifiEnabled: boolean;
  wifiSSID?: string | null;
  bluetoothEnabled: boolean;
  bluetoothDeviceName?: string | null;
  mobileDataEnabled: boolean;
  meterSerialNumber?: string | null;
  siceaRPM?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  context: TaskContext;
  estimatedDuration?: number | null;
  energyLevel?: EnergyLevel | null;
  completed: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  due?: Date | null;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  source: CalendarSource;
  externalId?: string | null;
  calendarId?: string | null;
  reminders?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  userId: string;
  calendarEventId?: string | null;
  title: string;
  message?: string | null;
  reminderType: ReminderType;
  status: ReminderStatus;
  scheduledFor: Date;
  sentAt?: Date | null;
  includeTraffic: boolean;
  includeWeather: boolean;
  trafficInfo?: Record<string, unknown> | null;
  weatherInfo?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  recurrenceEnd?: Date | null;
  parentReminderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  active: boolean;
  triggerType: RoutineTriggerType;
  triggerData?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutineStep {
  id: string;
  routineId: string;
  order: number;
  actionType: RoutineActionType;
  payload?: Record<string, unknown> | null;
  deviceId?: string | null;
  delaySeconds?: number | null;
}

export interface RoutineLog {
  id: string;
  routineId: string;
  executedAt: Date;
  status: string;
  details?: Record<string, unknown> | null;
}

// Ajoutez d'autres types selon vos besoins...

