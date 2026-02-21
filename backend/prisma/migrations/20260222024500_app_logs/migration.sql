-- CreateEnum
CREATE TYPE "public"."AppLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "public"."app_logs" (
    "id" UUID NOT NULL,
    "level" "public"."AppLogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_logs_created_at_idx" ON "public"."app_logs"("created_at");

-- CreateIndex
CREATE INDEX "app_logs_level_created_at_idx" ON "public"."app_logs"("level", "created_at");
