-- ============================================
-- INDEXES POUR OPTIMISATION
-- Compatible Supabase PostgreSQL
-- ============================================

-- Task indexes
CREATE INDEX "Task_userId_completed_idx" ON "Task"("userId", "completed");
CREATE INDEX "Task_userId_priority_idx" ON "Task"("userId", "priority");
CREATE INDEX "Task_userId_context_idx" ON "Task"("userId", "context");
CREATE INDEX "Task_userId_due_idx" ON "Task"("userId", "due");

-- CalendarEvent indexes
CREATE INDEX "CalendarEvent_userId_start_idx" ON "CalendarEvent"("userId", "start");
CREATE INDEX "CalendarEvent_externalId_idx" ON "CalendarEvent"("externalId");

-- CalendarChannel indexes
CREATE INDEX "CalendarChannel_userId_idx" ON "CalendarChannel"("userId");
CREATE INDEX "CalendarChannel_expiration_idx" ON "CalendarChannel"("expiration");

-- RoutineStep indexes
CREATE INDEX "RoutineStep_routineId_order_idx" ON "RoutineStep"("routineId", "order");

-- UserLearning indexes
CREATE INDEX "UserLearning_userId_category_idx" ON "UserLearning"("userId", "category");
CREATE INDEX "UserLearning_userId_lastObserved_idx" ON "UserLearning"("userId", "lastObserved");

-- UserActivity indexes
CREATE INDEX "UserActivity_userId_activityType_createdAt_idx" ON "UserActivity"("userId", "activityType", "createdAt");
CREATE INDEX "UserActivity_userId_createdAt_idx" ON "UserActivity"("userId", "createdAt");

-- Reminder indexes
CREATE INDEX "Reminder_userId_scheduledFor_idx" ON "Reminder"("userId", "scheduledFor");
CREATE INDEX "Reminder_status_scheduledFor_idx" ON "Reminder"("status", "scheduledFor");
CREATE INDEX "Reminder_calendarEventId_idx" ON "Reminder"("calendarEventId");
CREATE INDEX "Reminder_parentReminderId_idx" ON "Reminder"("parentReminderId");

-- PushSubscription indexes
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- HealthMetric indexes
CREATE INDEX "HealthMetric_userId_type_recordedAt_idx" ON "HealthMetric"("userId", "type", "recordedAt");
CREATE INDEX "HealthMetric_userId_recordedAt_idx" ON "HealthMetric"("userId", "recordedAt");

-- FavoriteArticle indexes
CREATE INDEX "FavoriteArticle_userId_createdAt_idx" ON "FavoriteArticle"("userId", "createdAt");
CREATE INDEX "FavoriteArticle_userId_category_idx" ON "FavoriteArticle"("userId", "category");

-- FavoriteStock indexes
CREATE INDEX "FavoriteStock_userId_createdAt_idx" ON "FavoriteStock"("userId", "createdAt");

-- Bill indexes
CREATE INDEX "Bill_userId_status_idx" ON "Bill"("userId", "status");
CREATE INDEX "Bill_userId_dueDate_idx" ON "Bill"("userId", "dueDate");
CREATE INDEX "Bill_userId_category_idx" ON "Bill"("userId", "category");
CREATE INDEX "Bill_status_dueDate_idx" ON "Bill"("status", "dueDate");

-- Income indexes
CREATE INDEX "Income_userId_isActive_idx" ON "Income"("userId", "isActive");
CREATE INDEX "Income_userId_frequency_idx" ON "Income"("userId", "frequency");

-- Expense indexes
CREATE INDEX "Expense_userId_date_idx" ON "Expense"("userId", "date");
CREATE INDEX "Expense_userId_category_idx" ON "Expense"("userId", "category");
CREATE INDEX "Expense_userId_frequency_idx" ON "Expense"("userId", "frequency");

-- Budget indexes
CREATE INDEX "Budget_userId_isActive_idx" ON "Budget"("userId", "isActive");
CREATE INDEX "Budget_userId_category_idx" ON "Budget"("userId", "category");
CREATE INDEX "Budget_userId_period_idx" ON "Budget"("userId", "period");

-- DashboardWidget indexes
CREATE INDEX "DashboardWidget_userId_position_idx" ON "DashboardWidget"("userId", "position");
CREATE INDEX "DashboardWidget_userId_visible_idx" ON "DashboardWidget"("userId", "visible");

-- EWeLinkCredentials indexes
CREATE INDEX "EWeLinkCredentials_userId_idx" ON "EWeLinkCredentials"("userId");

-- SecurityDevice indexes
CREATE INDEX "SecurityDevice_userId_type_idx" ON "SecurityDevice"("userId", "type");
CREATE INDEX "SecurityDevice_userId_status_idx" ON "SecurityDevice"("userId", "status");
CREATE INDEX "SecurityDevice_userId_provider_idx" ON "SecurityDevice"("userId", "provider");

-- EnedisCredentials indexes
CREATE INDEX "EnedisCredentials_userId_idx" ON "EnedisCredentials"("userId");

-- EnergyConsumption indexes
CREATE INDEX "EnergyConsumption_userId_date_idx" ON "EnergyConsumption"("userId", "date");
CREATE INDEX "EnergyConsumption_userId_idx" ON "EnergyConsumption"("userId");

-- SiceaCredentials indexes
CREATE INDEX "SiceaCredentials_userId_idx" ON "SiceaCredentials"("userId");
CREATE INDEX "SiceaCredentials_isActive_idx" ON "SiceaCredentials"("isActive");

-- SiceaScrapingJob indexes
CREATE INDEX "SiceaScrapingJob_credentialsId_status_idx" ON "SiceaScrapingJob"("credentialsId", "status");
CREATE INDEX "SiceaScrapingJob_startedAt_idx" ON "SiceaScrapingJob"("startedAt");

-- TotpSecret indexes
CREATE INDEX "TotpSecret_userId_idx" ON "TotpSecret"("userId");

-- TrustedDevice indexes
CREATE INDEX "TrustedDevice_userId_isActive_idx" ON "TrustedDevice"("userId", "isActive");
CREATE INDEX "TrustedDevice_lastSeenAt_idx" ON "TrustedDevice"("lastSeenAt");

-- SecurityLog indexes
CREATE INDEX "SecurityLog_userId_createdAt_idx" ON "SecurityLog"("userId", "createdAt");
CREATE INDEX "SecurityLog_eventType_createdAt_idx" ON "SecurityLog"("eventType", "createdAt");
CREATE INDEX "SecurityLog_severity_createdAt_idx" ON "SecurityLog"("severity", "createdAt");
CREATE INDEX "SecurityLog_ipAddress_idx" ON "SecurityLog"("ipAddress");

