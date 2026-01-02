-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "calendarEventId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "reminderType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "includeTraffic" BOOLEAN NOT NULL DEFAULT false,
    "includeWeather" BOOLEAN NOT NULL DEFAULT false,
    "trafficInfo" JSONB,
    "weatherInfo" JSONB,
    "metadata" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "recurrenceEnd" DATETIME,
    "parentReminderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reminder_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Reminder" ("calendarEventId", "createdAt", "id", "includeTraffic", "includeWeather", "message", "metadata", "reminderType", "scheduledFor", "sentAt", "status", "title", "trafficInfo", "updatedAt", "userId", "weatherInfo") SELECT "calendarEventId", "createdAt", "id", "includeTraffic", "includeWeather", "message", "metadata", "reminderType", "scheduledFor", "sentAt", "status", "title", "trafficInfo", "updatedAt", "userId", "weatherInfo" FROM "Reminder";
DROP TABLE "Reminder";
ALTER TABLE "new_Reminder" RENAME TO "Reminder";
CREATE INDEX "Reminder_userId_scheduledFor_idx" ON "Reminder"("userId", "scheduledFor");
CREATE INDEX "Reminder_status_scheduledFor_idx" ON "Reminder"("status", "scheduledFor");
CREATE INDEX "Reminder_calendarEventId_idx" ON "Reminder"("calendarEventId");
CREATE INDEX "Reminder_parentReminderId_idx" ON "Reminder"("parentReminderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
