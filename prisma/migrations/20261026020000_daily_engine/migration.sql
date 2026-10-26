-- CreateEnum
CREATE TYPE "DailySource" AS ENUM ('GENERATED', 'RESERVE', 'MANUAL');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChallengeStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "ChallengeStatus" ADD VALUE 'RESERVE';

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "fingerprint" TEXT;

-- AlterTable
ALTER TABLE "DailyChallenge" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "firstServedAt" TIMESTAMP(3),
ADD COLUMN     "source" "DailySource" NOT NULL DEFAULT 'GENERATED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ContentUsage" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "challengeId" TEXT NOT NULL,

    CONSTRAINT "ContentUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedContent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL DEFAULT '*',
    "key" TEXT NOT NULL,
    "label" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSettings" (
    "gameId" TEXT NOT NULL,
    "repeatWindowDays" INTEGER NOT NULL DEFAULT 30,
    "minDifficulty" INTEGER NOT NULL DEFAULT 1,
    "maxDifficulty" INTEGER NOT NULL DEFAULT 3,
    "targetDifficulty" INTEGER NOT NULL DEFAULT 2,
    "horizonDays" INTEGER NOT NULL DEFAULT 30,
    "reserveSize" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSettings_pkey" PRIMARY KEY ("gameId")
);

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "event" TEXT NOT NULL,
    "gameId" TEXT,
    "date" DATE,
    "message" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "GenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentUsage_gameId_key_date_idx" ON "ContentUsage"("gameId", "key", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ContentUsage_gameId_date_key_key" ON "ContentUsage"("gameId", "date", "key");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedContent_gameId_key_key" ON "BlockedContent"("gameId", "key");

-- CreateIndex
CREATE INDEX "GenerationLog_createdAt_idx" ON "GenerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationLog_level_createdAt_idx" ON "GenerationLog"("level", "createdAt");

-- CreateIndex
CREATE INDEX "Challenge_gameId_fingerprint_idx" ON "Challenge"("gameId", "fingerprint");

