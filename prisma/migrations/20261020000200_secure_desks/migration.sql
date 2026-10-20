-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DeskSession" (
    "id" TEXT NOT NULL,
    "millUserId" TEXT NOT NULL,
    "personId" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeskSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeskSession_personId_idx" ON "DeskSession"("personId");

-- CreateIndex
CREATE INDEX "DeskSession_millUserId_idx" ON "DeskSession"("millUserId");

