-- CreateTable
CREATE TABLE "public"."task_messages" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_messages_task_id_created_at_idx" ON "public"."task_messages"("task_id", "created_at");

-- CreateIndex
CREATE INDEX "task_messages_sender_id_idx" ON "public"."task_messages"("sender_id");

-- AddForeignKey
ALTER TABLE "public"."task_messages" ADD CONSTRAINT "task_messages_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_messages" ADD CONSTRAINT "task_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
