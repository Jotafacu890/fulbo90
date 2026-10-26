-- El default sólo hacía falta para completar filas existentes; Prisma maneja @updatedAt.
ALTER TABLE "DailyChallenge" ALTER COLUMN "updatedAt" DROP DEFAULT;
