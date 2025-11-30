-- CreateTable
CREATE TABLE "CalendarChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "expiration" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarChannel_channelId_key" ON "CalendarChannel"("channelId");

-- CreateIndex
CREATE INDEX "CalendarChannel_userId_idx" ON "CalendarChannel"("userId");

-- CreateIndex
CREATE INDEX "CalendarChannel_expiration_idx" ON "CalendarChannel"("expiration");
