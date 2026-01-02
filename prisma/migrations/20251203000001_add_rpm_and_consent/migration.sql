-- AlterTable
ALTER TABLE "EnedisCredentials" ADD COLUMN "rpm" TEXT;
ALTER TABLE "EnedisCredentials" ADD COLUMN "consentGiven" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EnedisCredentials" ADD COLUMN "consentDate" DATETIME;


