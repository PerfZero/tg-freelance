-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM (
    'PROPOSAL_CREATED',
    'EXECUTOR_SELECTED',
    'TASK_SENT_TO_REVIEW',
    'TASK_APPROVED',
    'TASK_REJECTED'
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "public"."notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "public"."notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
