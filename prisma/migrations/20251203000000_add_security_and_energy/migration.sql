-- AlterTable
ALTER TABLE "User" ADD COLUMN "mobileDataEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "meterSerialNumber" TEXT;

-- CreateEnum
CREATE TABLE "SecurityDeviceType" (
    "value" TEXT NOT NULL PRIMARY KEY
);
INSERT INTO "SecurityDeviceType" ("value") VALUES ('CAMERA'), ('MOTION_DETECTOR'), ('SMOKE_DETECTOR'), ('DOOR_SENSOR'), ('WINDOW_SENSOR'), ('ALARM'), ('GAS_DETECTOR'), ('WATER_LEAK_DETECTOR'), ('GLASS_BREAK_DETECTOR');

-- CreateEnum
CREATE TABLE "SecurityProvider" (
    "value" TEXT NOT NULL PRIMARY KEY
);
INSERT INTO "SecurityProvider" ("value") VALUES ('TUYA'), ('ZIGBEE'), ('SONOFF'), ('RTSP'), ('ONVIF'), ('EZVIZ'), ('NETATMO'), ('SOMFY'), ('LEGRAND'), ('OTHER');

-- CreateEnum
CREATE TABLE "SecurityDeviceStatus" (
    "value" TEXT NOT NULL PRIMARY KEY
);
INSERT INTO "SecurityDeviceStatus" ("value") VALUES ('ONLINE'), ('OFFLINE'), ('ALARM'), ('TRIGGERED'), ('DISARMED');

-- CreateTable
CREATE TABLE "SecurityDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "room" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "isArmed" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "connectionType" TEXT,
    "connectionUrl" TEXT,
    "credentials" TEXT,
    "capabilities" TEXT,
    "metadata" TEXT,
    "lastSeenAt" DATETIME,
    "lastTriggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SecurityDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnedisCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "meterSerialNumber" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "pdl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EnedisCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnergyConsumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "value" REAL NOT NULL,
    "cost" REAL,
    "peakHours" REAL,
    "offPeakHours" REAL,
    "source" TEXT NOT NULL DEFAULT 'enedis',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EnergyConsumption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SecurityDevice_userId_type_idx" ON "SecurityDevice"("userId", "type");

-- CreateIndex
CREATE INDEX "SecurityDevice_userId_status_idx" ON "SecurityDevice"("userId", "status");

-- CreateIndex
CREATE INDEX "SecurityDevice_userId_provider_idx" ON "SecurityDevice"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "EnedisCredentials_userId_key" ON "EnedisCredentials"("userId");

-- CreateIndex
CREATE INDEX "EnedisCredentials_userId_idx" ON "EnedisCredentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyConsumption_userId_date_key" ON "EnergyConsumption"("userId", "date");

-- CreateIndex
CREATE INDEX "EnergyConsumption_userId_date_idx" ON "EnergyConsumption"("userId", "date");

-- CreateIndex
CREATE INDEX "EnergyConsumption_userId_idx" ON "EnergyConsumption"("userId");


