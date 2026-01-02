-- CreateEnum
CREATE TABLE "ExpenseCategory" (
    "value" TEXT NOT NULL PRIMARY KEY
);
INSERT INTO "ExpenseCategory" ("value") VALUES ('FOOD'), ('TRANSPORT'), ('SHOPPING'), ('ENTERTAINMENT'), ('HEALTH'), ('EDUCATION'), ('CLOTHING'), ('HOME'), ('PERSONAL'), ('OTHER');

-- CreateEnum
CREATE TABLE "ExpenseFrequency" (
    "value" TEXT NOT NULL PRIMARY KEY
);
INSERT INTO "ExpenseFrequency" ("value") VALUES ('DAILY'), ('WEEKLY'), ('MONTHLY'), ('ONE_TIME');

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "frequency" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Income_userId_isActive_idx" ON "Income"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Income_userId_frequency_idx" ON "Income"("userId", "frequency");

-- CreateIndex
CREATE INDEX "Expense_userId_date_idx" ON "Expense"("userId", "date");

-- CreateIndex
CREATE INDEX "Expense_userId_category_idx" ON "Expense"("userId", "category");

-- CreateIndex
CREATE INDEX "Expense_userId_frequency_idx" ON "Expense"("userId", "frequency");






