-- ============================================
-- SCHEMA SQL COMPLET POUR SUPABASE (PostgreSQL)
-- Généré depuis prisma/schema.prisma
-- Compatible Supabase, prêt à être exécuté
-- ============================================

-- Extension pour générer des UUID (si nécessaire)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- TaskPriority
CREATE TYPE "TaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- TaskContext
CREATE TYPE "TaskContext" AS ENUM ('WORK', 'PERSONAL', 'SHOPPING', 'HEALTH', 'FINANCE', 'HOME', 'SOCIAL', 'LEARNING', 'OTHER');

-- EnergyLevel
CREATE TYPE "EnergyLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CalendarSource
CREATE TYPE "CalendarSource" AS ENUM ('GOOGLE', 'OUTLOOK', 'ICLOUD', 'LOCAL', 'OTHER');

-- RoutineTriggerType
CREATE TYPE "RoutineTriggerType" AS ENUM ('VOICE', 'SCHEDULE', 'LOCATION', 'MANUAL', 'SENSOR');

-- DeviceType
CREATE TYPE "DeviceType" AS ENUM ('LIGHT', 'THERMOSTAT', 'MEDIA', 'OUTLET', 'SENSOR', 'CAMERA', 'MOTION_DETECTOR', 'SMOKE_DETECTOR', 'DOOR_SENSOR', 'WINDOW_SENSOR', 'ALARM', 'OTHER');

-- RoutineActionType
CREATE TYPE "RoutineActionType" AS ENUM ('DEVICE_COMMAND', 'NOTIFICATION', 'TASK_CREATE', 'MEDIA_PLAY', 'CUSTOM');

-- ReminderType
CREATE TYPE "ReminderType" AS ENUM ('PUSH', 'EMAIL', 'SMS');

-- ReminderStatus
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- HealthMetricType
CREATE TYPE "HealthMetricType" AS ENUM ('SLEEP', 'ACTIVITY', 'HEART_RATE', 'WEIGHT', 'STEPS', 'CALORIES', 'HYDRATION', 'MOOD', 'STRESS', 'BLOOD_PRESSURE', 'OTHER');

-- BillCategory
CREATE TYPE "BillCategory" AS ENUM ('UTILITIES', 'INTERNET', 'INSURANCE', 'SUBSCRIPTION', 'RENT', 'TAXES', 'HEALTH', 'TRANSPORT', 'EDUCATION', 'OTHER');

-- BillStatus
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- ExpenseCategory
CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH', 'EDUCATION', 'CLOTHING', 'HOME', 'PERSONAL', 'OTHER');

-- ExpenseFrequency
CREATE TYPE "ExpenseFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME');

-- SecurityDeviceType
CREATE TYPE "SecurityDeviceType" AS ENUM ('CAMERA', 'MOTION_DETECTOR', 'SMOKE_DETECTOR', 'DOOR_SENSOR', 'WINDOW_SENSOR', 'ALARM', 'GAS_DETECTOR', 'WATER_LEAK_DETECTOR', 'GLASS_BREAK_DETECTOR');

-- SecurityProvider
CREATE TYPE "SecurityProvider" AS ENUM ('TUYA', 'ZIGBEE', 'SONOFF', 'RTSP', 'ONVIF', 'EZVIZ', 'NETATMO', 'SOMFY', 'LEGRAND', 'OTHER');

-- SecurityDeviceStatus
CREATE TYPE "SecurityDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ALARM', 'TRIGGERED', 'DISARMED');

-- ============================================
-- TABLES
-- ============================================

-- User
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "userCode" TEXT,
    "pseudo" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "homeAddress" TEXT,
    "workAddress" TEXT,
    "workLat" DOUBLE PRECISION,
    "workLng" DOUBLE PRECISION,
    "wifiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "wifiSSID" TEXT,
    "bluetoothEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bluetoothDeviceName" TEXT,
    "mobileDataEnabled" BOOLEAN NOT NULL DEFAULT false,
    "meterSerialNumber" TEXT,
    "siceaRPM" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Account (NextAuth - à supprimer si pas utilisé)
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT
);

-- Session (NextAuth - à supprimer si pas utilisé)
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- VerificationToken (NextAuth - à supprimer si pas utilisé)
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- Task
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "context" "TaskContext" NOT NULL DEFAULT 'PERSONAL',
    "estimatedDuration" INTEGER,
    "energyLevel" "EnergyLevel",
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "due" TIMESTAMP(3)
);

-- Message
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CalendarEvent
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "source" "CalendarSource" NOT NULL DEFAULT 'LOCAL',
    "externalId" TEXT,
    "calendarId" TEXT,
    "reminders" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CalendarChannel
CREATE TABLE "CalendarChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "expiration" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Routine
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" "RoutineTriggerType" NOT NULL DEFAULT 'MANUAL',
    "triggerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Device
CREATE TABLE "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL DEFAULT 'OTHER',
    "capabilities" JSONB,
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- RoutineStep
CREATE TABLE "RoutineStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routineId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "actionType" "RoutineActionType" NOT NULL,
    "payload" JSONB,
    "deviceId" TEXT,
    "delaySeconds" INTEGER
);

-- RoutineLog
CREATE TABLE "RoutineLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routineId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "details" JSONB
);

-- Preference
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- UserLearning
CREATE TABLE "UserLearning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "lastObserved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- UserActivity
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reminder
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "calendarEventId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "reminderType" "ReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "includeTraffic" BOOLEAN NOT NULL DEFAULT false,
    "includeWeather" BOOLEAN NOT NULL DEFAULT false,
    "trafficInfo" JSONB,
    "weatherInfo" JSONB,
    "metadata" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "recurrenceEnd" TIMESTAMP(3),
    "parentReminderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- PushSubscription
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- HealthMetric
CREATE TABLE "HealthMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" "HealthMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "source" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- FavoriteArticle
CREATE TABLE "FavoriteArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- FavoriteStock
CREATE TABLE "FavoriteStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "currency" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Bill
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "BillCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "reference" TEXT,
    "reminderDays" INTEGER NOT NULL DEFAULT 3,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Income
CREATE TABLE "Income" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Expense
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "frequency" "ExpenseFrequency" NOT NULL DEFAULT 'ONE_TIME',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Budget
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "alertThreshold" DOUBLE PRECISION DEFAULT 80,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- DashboardWidget
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "column" INTEGER NOT NULL DEFAULT 1,
    "row" INTEGER NOT NULL DEFAULT 1,
    "size" TEXT NOT NULL DEFAULT 'medium',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- EWeLinkCredentials
CREATE TABLE "EWeLinkCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "region" TEXT NOT NULL DEFAULT 'eu',
    "appId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- SecurityDevice
CREATE TABLE "SecurityDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SecurityDeviceType" NOT NULL,
    "provider" "SecurityProvider" NOT NULL,
    "externalId" TEXT,
    "room" TEXT,
    "status" "SecurityDeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "isArmed" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "connectionType" TEXT,
    "connectionUrl" TEXT,
    "credentials" JSONB,
    "capabilities" JSONB,
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- EnedisCredentials
CREATE TABLE "EnedisCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "meterSerialNumber" TEXT NOT NULL,
    "rpm" TEXT,
    "linkyToken" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "pdl" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- EnergyConsumption
CREATE TABLE "EnergyConsumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION,
    "peakHours" DOUBLE PRECISION,
    "offPeakHours" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'enedis',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- SiceaCredentials
CREATE TABLE "SiceaCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "contractNumber" TEXT,
    "lastScrapedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- SiceaScrapingJob
CREATE TABLE "SiceaScrapingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialsId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dataRetrieved" JSONB,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- TotpSecret
CREATE TABLE "TotpSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- TrustedDevice
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- SecurityLog
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "details" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AgentMemory (Mémoire long terme pour Cinexa)
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intent" TEXT,
    "agents" TEXT[],
    "result" TEXT,
    "tokens" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
