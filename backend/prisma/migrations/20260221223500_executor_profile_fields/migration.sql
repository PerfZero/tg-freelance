-- CreateEnum
CREATE TYPE "public"."ExperienceLevel" AS ENUM ('JUNIOR', 'MIDDLE', 'SENIOR');

-- AlterTable
ALTER TABLE "public"."profiles"
ADD COLUMN "portfolio_links" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "base_price" DECIMAL(12,2),
ADD COLUMN "experience_level" "public"."ExperienceLevel";
