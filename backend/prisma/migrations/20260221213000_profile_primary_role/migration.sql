-- CreateEnum
CREATE TYPE "public"."ProfilePrimaryRole" AS ENUM ('CUSTOMER', 'EXECUTOR');

-- AlterTable
ALTER TABLE "public"."profiles"
ADD COLUMN "primary_role" "public"."ProfilePrimaryRole";
