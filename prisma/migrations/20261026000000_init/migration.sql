-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AchievementResult" AS ENUM ('WINNER', 'RUNNER_UP', 'TOP_SCORER', 'BEST_PLAYER');

-- CreateEnum
CREATE TYPE "public"."ChallengeMode" AS ENUM ('DAILY', 'INFINITE', 'CURATED');

-- CreateEnum
CREATE TYPE "public"."ChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."CompetitionType" AS ENUM ('CLUB_INTERNATIONAL', 'CLUB_LEAGUE', 'CLUB_CUP', 'NATIONAL_TEAM');

-- CreateEnum
CREATE TYPE "public"."Position" AS ENUM ('ARQ', 'LD', 'DFC', 'LI', 'MCD', 'MC', 'MCO', 'MD', 'MI', 'ED', 'EI', 'DC');

-- CreateTable
CREATE TABLE "public"."Achievement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "competitionId" TEXT,
    "result" "public"."AchievementResult" NOT NULL DEFAULT 'WINNER',
    "description" TEXT,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnswerStat" (
    "id" TEXT NOT NULL,
    "challengeKey" TEXT NOT NULL,
    "cellKey" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnswerStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Challenge" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "title" TEXT,
    "mode" "public"."ChallengeMode" NOT NULL DEFAULT 'CURATED',
    "status" "public"."ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "seed" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChallengeAnswer" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "playerId" TEXT,
    "value" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT true,
    "pickCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChallengeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChallengeCondition" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChallengeCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "foundedYear" INTEGER,
    "nickname" TEXT,
    "stadium" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 3,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClubAchievement" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "result" "public"."AchievementResult" NOT NULL DEFAULT 'WINNER',

    CONSTRAINT "ClubAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Coach" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "playerId" TEXT,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoachStint" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clubId" TEXT,
    "nationalTeamId" TEXT,
    "fromYear" INTEGER NOT NULL,
    "toYear" INTEGER,

    CONSTRAINT "CoachStint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT,
    "type" "public"."CompetitionType" NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyChallenge" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "gameId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "launchDate" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Match" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "competitionId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "venue" TEXT,
    "homeClubId" TEXT,
    "homeNationalTeamId" TEXT,
    "awayClubId" TEXT,
    "awayNationalTeamId" TEXT,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "homePenalties" INTEGER,
    "awayPenalties" INTEGER,
    "homeFormation" TEXT,
    "awayFormation" TEXT,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchLineup" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "starter" BOOLEAN NOT NULL DEFAULT true,
    "position" "public"."Position" NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NationalTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "confederation" TEXT NOT NULL,

    CONSTRAINT "NationalTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "shortName" TEXT,
    "normalizedName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "secondNationality" TEXT,
    "birthDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "primaryPosition" "public"."Position" NOT NULL,
    "secondaryPositions" "public"."Position"[],
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerClub" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "fromYear" INTEGER,
    "toYear" INTEGER,
    "isYouth" BOOLEAN NOT NULL DEFAULT false,
    "isAcademy" BOOLEAN NOT NULL DEFAULT false,
    "isLoan" BOOLEAN NOT NULL DEFAULT false,
    "appearances" INTEGER,
    "goals" INTEGER,

    CONSTRAINT "PlayerClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCompetitionAchievement" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "result" "public"."AchievementResult" NOT NULL DEFAULT 'WINNER',
    "clubId" TEXT,
    "nationalTeamId" TEXT,

    CONSTRAINT "PlayerCompetitionAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerNationalTeam" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "nationalTeamId" TEXT NOT NULL,
    "fromYear" INTEGER,
    "toYear" INTEGER,
    "caps" INTEGER,
    "goals" INTEGER,

    CONSTRAINT "PlayerNationalTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "anonymousId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserGameResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "gameId" TEXT NOT NULL,
    "challengeId" TEXT,
    "challengeKey" TEXT NOT NULL,
    "dailyDate" DATE,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "timeMs" INTEGER,
    "rarity" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGameResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerStat_challengeKey_cellKey_idx" ON "public"."AnswerStat"("challengeKey" ASC, "cellKey" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AnswerStat_challengeKey_cellKey_playerId_key" ON "public"."AnswerStat"("challengeKey" ASC, "cellKey" ASC, "playerId" ASC);

-- CreateIndex
CREATE INDEX "Challenge_gameId_status_idx" ON "public"."Challenge"("gameId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "ChallengeAnswer_challengeId_key_idx" ON "public"."ChallengeAnswer"("challengeId" ASC, "key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeCondition_challengeId_key_key" ON "public"."ChallengeCondition"("challengeId" ASC, "key" ASC);

-- CreateIndex
CREATE INDEX "Club_country_idx" ON "public"."Club"("country" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ClubAchievement_clubId_competitionId_season_result_key" ON "public"."ClubAchievement"("clubId" ASC, "competitionId" ASC, "season" ASC, "result" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Coach_playerId_key" ON "public"."Coach"("playerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_date_gameId_key" ON "public"."DailyChallenge"("date" ASC, "gameId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineup_matchId_playerId_key" ON "public"."MatchLineup"("matchId" ASC, "playerId" ASC);

-- CreateIndex
CREATE INDEX "Player_normalizedName_idx" ON "public"."Player"("normalizedName" ASC);

-- CreateIndex
CREATE INDEX "PlayerClub_clubId_idx" ON "public"."PlayerClub"("clubId" ASC);

-- CreateIndex
CREATE INDEX "PlayerClub_playerId_idx" ON "public"."PlayerClub"("playerId" ASC);

-- CreateIndex
CREATE INDEX "PlayerCompetitionAchievement_competitionId_idx" ON "public"."PlayerCompetitionAchievement"("competitionId" ASC);

-- CreateIndex
CREATE INDEX "PlayerCompetitionAchievement_playerId_idx" ON "public"."PlayerCompetitionAchievement"("playerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerNationalTeam_playerId_nationalTeamId_key" ON "public"."PlayerNationalTeam"("playerId" ASC, "nationalTeamId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_anonymousId_key" ON "public"."User"("anonymousId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE INDEX "UserGameResult_anonymousId_idx" ON "public"."UserGameResult"("anonymousId" ASC);

-- CreateIndex
CREATE INDEX "UserGameResult_gameId_dailyDate_idx" ON "public"."UserGameResult"("gameId" ASC, "dailyDate" ASC);

-- AddForeignKey
ALTER TABLE "public"."Achievement" ADD CONSTRAINT "Achievement_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Challenge" ADD CONSTRAINT "Challenge_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengeAnswer" ADD CONSTRAINT "ChallengeAnswer_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengeAnswer" ADD CONSTRAINT "ChallengeAnswer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengeCondition" ADD CONSTRAINT "ChallengeCondition_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClubAchievement" ADD CONSTRAINT "ClubAchievement_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "public"."Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClubAchievement" ADD CONSTRAINT "ClubAchievement_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Coach" ADD CONSTRAINT "Coach_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachStint" ADD CONSTRAINT "CoachStint_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "public"."Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachStint" ADD CONSTRAINT "CoachStint_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "public"."Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachStint" ADD CONSTRAINT "CoachStint_nationalTeamId_fkey" FOREIGN KEY ("nationalTeamId") REFERENCES "public"."NationalTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyChallenge" ADD CONSTRAINT "DailyChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyChallenge" ADD CONSTRAINT "DailyChallenge_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "public"."Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_awayNationalTeamId_fkey" FOREIGN KEY ("awayNationalTeamId") REFERENCES "public"."NationalTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "public"."Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_homeNationalTeamId_fkey" FOREIGN KEY ("homeNationalTeamId") REFERENCES "public"."NationalTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchLineup" ADD CONSTRAINT "MatchLineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerClub" ADD CONSTRAINT "PlayerClub_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "public"."Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerClub" ADD CONSTRAINT "PlayerClub_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCompetitionAchievement" ADD CONSTRAINT "PlayerCompetitionAchievement_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "public"."Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCompetitionAchievement" ADD CONSTRAINT "PlayerCompetitionAchievement_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCompetitionAchievement" ADD CONSTRAINT "PlayerCompetitionAchievement_nationalTeamId_fkey" FOREIGN KEY ("nationalTeamId") REFERENCES "public"."NationalTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCompetitionAchievement" ADD CONSTRAINT "PlayerCompetitionAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerNationalTeam" ADD CONSTRAINT "PlayerNationalTeam_nationalTeamId_fkey" FOREIGN KEY ("nationalTeamId") REFERENCES "public"."NationalTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerNationalTeam" ADD CONSTRAINT "PlayerNationalTeam_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGameResult" ADD CONSTRAINT "UserGameResult_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGameResult" ADD CONSTRAINT "UserGameResult_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGameResult" ADD CONSTRAINT "UserGameResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

