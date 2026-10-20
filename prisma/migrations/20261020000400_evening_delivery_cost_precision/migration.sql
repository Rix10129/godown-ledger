-- AlterTable
ALTER TABLE "ProductBatch" ALTER COLUMN "purchasePrice" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "SaleInvoiceItem" ALTER COLUMN "costPrice" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "SaleReturnItem" ALTER COLUMN "costPrice" SET DATA TYPE DECIMAL(18,8);

-- CreateTable
CREATE TABLE "EveningDelivery" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EveningDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EveningDelivery_companyId_businessDate_channel_key" ON "EveningDelivery"("companyId", "businessDate", "channel");

