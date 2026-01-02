-- CreateTable: SiceaCredentials
CREATE TABLE "SiceaCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "contractNumber" TEXT,
    "lastScrapedAt" DATETIME,
    "lastError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SiceaCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: SiceaScrapingJob
CREATE TABLE "SiceaScrapingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialsId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "dataRetrieved" TEXT,
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SiceaScrapingJob_credentialsId_fkey" FOREIGN KEY ("credentialsId") REFERENCES "SiceaCredentials" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: TotpSecret
CREATE TABLE "TotpSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TotpSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: TrustedDevice
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: SecurityLog
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "details" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex: SiceaCredentials
CREATE UNIQUE INDEX "SiceaCredentials_userId_key" ON "SiceaCredentials"("userId");
CREATE INDEX "SiceaCredentials_userId_idx" ON "SiceaCredentials"("userId");
CREATE INDEX "SiceaCredentials_isActive_idx" ON "SiceaCredentials"("isActive");

-- CreateIndex: SiceaScrapingJob
CREATE INDEX "SiceaScrapingJob_credentialsId_status_idx" ON "SiceaScrapingJob"("credentialsId", "status");
CREATE INDEX "SiceaScrapingJob_startedAt_idx" ON "SiceaScrapingJob"("startedAt");

-- CreateIndex: TotpSecret
CREATE UNIQUE INDEX "TotpSecret_userId_key" ON "TotpSecret"("userId");
CREATE INDEX "TotpSecret_userId_idx" ON "TotpSecret"("userId");

-- CreateIndex: TrustedDevice
CREATE UNIQUE INDEX "TrustedDevice_userId_deviceId_key" ON "TrustedDevice"("userId", "deviceId");
CREATE INDEX "TrustedDevice_userId_isActive_idx" ON "TrustedDevice"("userId", "isActive");
CREATE INDEX "TrustedDevice_lastSeenAt_idx" ON "TrustedDevice"("lastSeenAt");

-- CreateIndex: SecurityLog
CREATE INDEX "SecurityLog_userId_createdAt_idx" ON "SecurityLog"("userId", "createdAt");
CREATE INDEX "SecurityLog_eventType_createdAt_idx" ON "SecurityLog"("eventType", "createdAt");
CREATE INDEX "SecurityLog_severity_createdAt_idx" ON "SecurityLog"("severity", "createdAt");
CREATE INDEX "SecurityLog_ipAddress_idx" ON "SecurityLog"("ipAddress");

