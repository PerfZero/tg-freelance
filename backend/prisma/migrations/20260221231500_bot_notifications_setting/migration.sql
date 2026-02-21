-- AlterTable
ALTER TABLE "public"."profiles"
ADD COLUMN "bot_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;
