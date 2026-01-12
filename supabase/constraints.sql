-- ============================================
-- CONTRAINTES (UNIQUE, FOREIGN KEYS)
-- Compatible Supabase PostgreSQL
-- ============================================

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

-- User
ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");
ALTER TABLE "User" ADD CONSTRAINT "User_userCode_key" UNIQUE ("userCode");

-- Account
ALTER TABLE "Account" ADD CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId");

-- Session
ALTER TABLE "Session" ADD CONSTRAINT "Session_sessionToken_key" UNIQUE ("sessionToken");

-- VerificationToken
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_token_key" UNIQUE ("token");
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token");

-- Device
ALTER TABLE "Device" ADD CONSTRAINT "Device_provider_externalId_key" UNIQUE ("provider", "externalId");

-- Preference
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_key_key" UNIQUE ("userId", "key");

-- UserLearning
ALTER TABLE "UserLearning" ADD CONSTRAINT "UserLearning_userId_category_pattern_key" UNIQUE ("userId", "category", "pattern");

-- PushSubscription
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint");

-- CalendarChannel
ALTER TABLE "CalendarChannel" ADD CONSTRAINT "CalendarChannel_channelId_key" UNIQUE ("channelId");

-- FavoriteArticle
ALTER TABLE "FavoriteArticle" ADD CONSTRAINT "FavoriteArticle_userId_url_key" UNIQUE ("userId", "url");

-- FavoriteStock
ALTER TABLE "FavoriteStock" ADD CONSTRAINT "FavoriteStock_userId_symbol_key" UNIQUE ("userId", "symbol");

-- EnergyConsumption
ALTER TABLE "EnergyConsumption" ADD CONSTRAINT "EnergyConsumption_userId_date_key" UNIQUE ("userId", "date");

-- EWeLinkCredentials
ALTER TABLE "EWeLinkCredentials" ADD CONSTRAINT "EWeLinkCredentials_userId_key" UNIQUE ("userId");

-- EnedisCredentials
ALTER TABLE "EnedisCredentials" ADD CONSTRAINT "EnedisCredentials_userId_key" UNIQUE ("userId");

-- SiceaCredentials
ALTER TABLE "SiceaCredentials" ADD CONSTRAINT "SiceaCredentials_userId_key" UNIQUE ("userId");

-- TotpSecret
ALTER TABLE "TotpSecret" ADD CONSTRAINT "TotpSecret_userId_key" UNIQUE ("userId");

-- TrustedDevice
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_deviceId_key" UNIQUE ("userId", "deviceId");

-- DashboardWidget
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_userId_widgetType_key" UNIQUE ("userId", "widgetType");

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Account -> User
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Session -> User
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Task -> User
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message -> User
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CalendarEvent -> User
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CalendarChannel -> User
ALTER TABLE "CalendarChannel" ADD CONSTRAINT "CalendarChannel_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Routine -> User
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Device -> User
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RoutineStep -> Routine
ALTER TABLE "RoutineStep" ADD CONSTRAINT "RoutineStep_routineId_fkey" 
    FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RoutineStep -> Device
ALTER TABLE "RoutineStep" ADD CONSTRAINT "RoutineStep_deviceId_fkey" 
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RoutineLog -> Routine
ALTER TABLE "RoutineLog" ADD CONSTRAINT "RoutineLog_routineId_fkey" 
    FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preference -> User
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserLearning -> User
ALTER TABLE "UserLearning" ADD CONSTRAINT "UserLearning_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserActivity -> User
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reminder -> User
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reminder -> CalendarEvent
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_calendarEventId_fkey" 
    FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PushSubscription -> User
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HealthMetric -> User
ALTER TABLE "HealthMetric" ADD CONSTRAINT "HealthMetric_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FavoriteArticle -> User
ALTER TABLE "FavoriteArticle" ADD CONSTRAINT "FavoriteArticle_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FavoriteStock -> User
ALTER TABLE "FavoriteStock" ADD CONSTRAINT "FavoriteStock_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bill -> User
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Income -> User
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Expense -> User
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Budget -> User
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DashboardWidget -> User
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EWeLinkCredentials -> User
ALTER TABLE "EWeLinkCredentials" ADD CONSTRAINT "EWeLinkCredentials_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SecurityDevice -> User
ALTER TABLE "SecurityDevice" ADD CONSTRAINT "SecurityDevice_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnedisCredentials -> User
ALTER TABLE "EnedisCredentials" ADD CONSTRAINT "EnedisCredentials_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnergyConsumption -> User
ALTER TABLE "EnergyConsumption" ADD CONSTRAINT "EnergyConsumption_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SiceaCredentials -> User
ALTER TABLE "SiceaCredentials" ADD CONSTRAINT "SiceaCredentials_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SiceaScrapingJob -> SiceaCredentials
ALTER TABLE "SiceaScrapingJob" ADD CONSTRAINT "SiceaScrapingJob_credentialsId_fkey" 
    FOREIGN KEY ("credentialsId") REFERENCES "SiceaCredentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TotpSecret -> User
ALTER TABLE "TotpSecret" ADD CONSTRAINT "TotpSecret_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TrustedDevice -> User
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SecurityLog -> User
ALTER TABLE "SecurityLog" ADD CONSTRAINT "SecurityLog_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

