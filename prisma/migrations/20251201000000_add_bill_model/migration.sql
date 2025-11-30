-- CreateEnum
CREATE TABLE "BillCategory" (
    "value" TEXT NOT NULL PRIMARY KEY
);
INSERT INTO "BillCategory" ("value") VALUES ('UTILITIES'), ('INTERNET'), ('INSURANCE'), ('SUBSCRIPTION'), ('RENT'), ('TAXES'), ('HEALTH'), ('TRANSPORT'), ('EDUCATION'), ('OTHER');

-- CreateEnum
CREATE TABLE "BillStatus" (
    "value" TEXT NOT NULL PRIMARY KEY
);
INSERT INTO "BillStatus" ("value") VALUES ('PENDING'), ('PAID'), ('OVERDUE'), ('CANCELLED');

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "dueDate" DATETIME NOT NULL,
    "paidDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "reference" TEXT,
    "reminderDays" INTEGER NOT NULL DEFAULT 3,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Bill_userId_status_idx" ON "Bill"("userId", "status");

-- CreateIndex
CREATE INDEX "Bill_userId_dueDate_idx" ON "Bill"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Bill_userId_category_idx" ON "Bill"("userId", "category");

-- CreateIndex
CREATE INDEX "Bill_status_dueDate_idx" ON "Bill"("status", "dueDate");

