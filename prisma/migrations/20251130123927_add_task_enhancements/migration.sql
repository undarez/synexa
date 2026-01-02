/*
  Warnings:

  - Added the required column `updatedAt` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "context" TEXT NOT NULL DEFAULT 'PERSONAL',
    "estimatedDuration" INTEGER,
    "energyLevel" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "due" DATETIME,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "due", "id", "title", "userId") SELECT "createdAt", "due", "id", "title", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_userId_completed_idx" ON "Task"("userId", "completed");
CREATE INDEX "Task_userId_priority_idx" ON "Task"("userId", "priority");
CREATE INDEX "Task_userId_context_idx" ON "Task"("userId", "context");
CREATE INDEX "Task_userId_due_idx" ON "Task"("userId", "due");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
