-- CreateEnum
CREATE TYPE "public"."AdminAuditAction" AS ENUM ('USER_BLOCK_CHANGED', 'TASK_MODERATED');

-- CreateEnum
CREATE TYPE "public"."AdminAuditTargetType" AS ENUM ('USER', 'TASK');

-- CreateTable
CREATE TABLE "public"."admin_audit_logs" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "action" "public"."AdminAuditAction" NOT NULL,
    "target_type" "public"."AdminAuditTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_user_id_created_at_idx" ON "public"."admin_audit_logs"("admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_type_target_id_created_at_idx" ON "public"."admin_audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "public"."admin_audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "public"."admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
