-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ON_REVIEW', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "username" TEXT,
    "display_name" TEXT NOT NULL,
    "role_flags" JSONB NOT NULL,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."profiles" (
    "user_id" UUID NOT NULL,
    "about" TEXT,
    "skills" TEXT[],
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "completed_tasks_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" DECIMAL(12,2) NOT NULL,
    "deadline_at" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "status" "public"."TaskStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."proposals" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "executor_id" UUID NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "comment" TEXT NOT NULL,
    "eta_days" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignments" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "executor_id" UUID NOT NULL,
    "selected_proposal_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_status_history" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "from_status" "public"."TaskStatus",
    "to_status" "public"."TaskStatus" NOT NULL,
    "changed_by" UUID NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "public"."users"("telegram_id");

-- CreateIndex
CREATE INDEX "tasks_customer_id_idx" ON "public"."tasks"("customer_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "public"."tasks"("status");

-- CreateIndex
CREATE INDEX "proposals_task_id_idx" ON "public"."proposals"("task_id");

-- CreateIndex
CREATE INDEX "proposals_executor_id_idx" ON "public"."proposals"("executor_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_task_id_executor_id_key" ON "public"."proposals"("task_id", "executor_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_task_id_key" ON "public"."assignments"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_selected_proposal_id_key" ON "public"."assignments"("selected_proposal_id");

-- CreateIndex
CREATE INDEX "assignments_customer_id_idx" ON "public"."assignments"("customer_id");

-- CreateIndex
CREATE INDEX "assignments_executor_id_idx" ON "public"."assignments"("executor_id");

-- CreateIndex
CREATE INDEX "task_status_history_task_id_idx" ON "public"."task_status_history"("task_id");

-- CreateIndex
CREATE INDEX "task_status_history_changed_by_idx" ON "public"."task_status_history"("changed_by");

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proposals" ADD CONSTRAINT "proposals_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proposals" ADD CONSTRAINT "proposals_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_selected_proposal_id_fkey" FOREIGN KEY ("selected_proposal_id") REFERENCES "public"."proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_status_history" ADD CONSTRAINT "task_status_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_status_history" ADD CONSTRAINT "task_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
