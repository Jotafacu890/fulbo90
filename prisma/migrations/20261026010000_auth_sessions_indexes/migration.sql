-- Extensión para búsqueda difusa por nombre (índice GIN trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- DropIndex
DROP INDEX "PlayerClub_clubId_idx";

-- DropIndex
DROP INDEX "PlayerCompetitionAchievement_competitionId_idx";

-- DropIndex
DROP INDEX "UserGameResult_anonymousId_idx";

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "displayName" SET NOT NULL;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "DailyChallenge_date_idx" ON "DailyChallenge"("date");

-- CreateIndex
CREATE INDEX "Player_normalizedName_trgm_idx" ON "Player" USING GIN ("normalizedName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PlayerClub_clubId_playerId_idx" ON "PlayerClub"("clubId", "playerId");

-- CreateIndex
CREATE INDEX "PlayerCompetitionAchievement_competitionId_clubId_idx" ON "PlayerCompetitionAchievement"("competitionId", "clubId");

-- CreateIndex
CREATE INDEX "UserGameResult_userId_createdAt_idx" ON "UserGameResult"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserGameResult_userId_challengeKey_key" ON "UserGameResult"("userId", "challengeKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

