-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "directDeal" JSONB;

-- AlterTable
ALTER TABLE "SaleInvoice" ADD COLUMN     "directDeal" JSONB,
ADD COLUMN     "directKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SaleInvoice_directKey_key" ON "SaleInvoice"("directKey");

