-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "column" INTEGER NOT NULL DEFAULT 1,
    "row" INTEGER NOT NULL DEFAULT 1,
    "size" TEXT NOT NULL DEFAULT 'medium',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DashboardWidget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardWidget_userId_widgetType_key" ON "DashboardWidget"("userId", "widgetType");

-- CreateIndex
CREATE INDEX "DashboardWidget_userId_position_idx" ON "DashboardWidget"("userId", "position");

-- CreateIndex
CREATE INDEX "DashboardWidget_userId_visible_idx" ON "DashboardWidget"("userId", "visible");

