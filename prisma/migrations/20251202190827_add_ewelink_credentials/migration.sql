-- CreateTable
CREATE TABLE "EWeLinkCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "region" TEXT NOT NULL DEFAULT 'eu',
    "appId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EWeLinkCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EWeLinkCredentials_userId_key" ON "EWeLinkCredentials"("userId");

-- CreateIndex
CREATE INDEX "EWeLinkCredentials_userId_idx" ON "EWeLinkCredentials"("userId");
