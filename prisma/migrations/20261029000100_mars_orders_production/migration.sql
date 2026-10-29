-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CustomerType" ADD VALUE 'BUKRAM';
ALTER TYPE "CustomerType" ADD VALUE 'PRODUCTION_CLOTH';

-- AlterTable
ALTER TABLE "ProductBatch" ADD COLUMN     "isThaan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "productionReceiptId" TEXT;

-- AlterTable
ALTER TABLE "SaleInvoiceItem" ADD COLUMN     "orderItemId" TEXT;

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "CustomerOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionUnit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wageRate" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ProductionUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "yarnBatchId" TEXT NOT NULL,
    "clothProductId" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "issuedQuantity" DECIMAL(14,3) NOT NULL,
    "consumedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "returnedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "allocatedYarnCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "yarnUnitCost" DECIMAL(18,8) NOT NULL,
    "wageRate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "meters" DECIMAL(14,3) NOT NULL,
    "yarnConsumed" DECIMAL(14,3) NOT NULL,
    "wages" DECIMAL(12,2) NOT NULL,
    "yarnCost" DECIMAL(12,2) NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'POSTED',

    CONSTRAINT "ProductionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPayment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "reference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'POSTED',

    CONSTRAINT "ProductionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyStockEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "reference" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyStockEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOrder_companyId_orderNumber_key" ON "CustomerOrder"("companyId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOrderItem_orderId_productId_key" ON "CustomerOrderItem"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionUnit_companyId_name_key" ON "ProductionUnit"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJob_companyId_jobNumber_key" ON "ProductionJob"("companyId", "jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReceipt_companyId_receiptNumber_key" ON "ProductionReceipt"("companyId", "receiptNumber");

-- CreateIndex
CREATE INDEX "ProductionPayment_companyId_unitId_idx" ON "ProductionPayment"("companyId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyStockEntry_companyId_reference_key" ON "PartyStockEntry"("companyId", "reference");

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productionReceiptId_fkey" FOREIGN KEY ("productionReceiptId") REFERENCES "ProductionReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInvoiceItem" ADD CONSTRAINT "SaleInvoiceItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "CustomerOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUnit" ADD CONSTRAINT "ProductionUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_yarnBatchId_fkey" FOREIGN KEY ("yarnBatchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_clothProductId_fkey" FOREIGN KEY ("clothProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReceipt" ADD CONSTRAINT "ProductionReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReceipt" ADD CONSTRAINT "ProductionReceipt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProductionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPayment" ADD CONSTRAINT "ProductionPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPayment" ADD CONSTRAINT "ProductionPayment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyStockEntry" ADD CONSTRAINT "PartyStockEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyStockEntry" ADD CONSTRAINT "PartyStockEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyStockEntry" ADD CONSTRAINT "PartyStockEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing duplicate references remain available for reconciliation. Reject new
-- duplicates atomically, including simultaneous requests, without deleting data.
CREATE FUNCTION reject_duplicate_payment_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('app.restoring_backup', true) = 'on' THEN RETURN NEW; END IF;
 IF NEW.status::text <> 'POSTED' OR nullif(btrim(NEW.reference),'') IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.reference IS NOT DISTINCT FROM NEW.reference AND OLD."paymentMode"=NEW."paymentMode" AND OLD.status=NEW.status THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW."companyId" || ':' || TG_TABLE_NAME || ':' || NEW."paymentMode"::text || ':' || upper(btrim(NEW.reference)), 0));
 IF TG_TABLE_NAME='CustomerPayment' THEN
  IF EXISTS(SELECT 1 FROM "CustomerPayment" p WHERE p.id<>NEW.id AND p."companyId"=NEW."companyId" AND p.status='POSTED' AND p."paymentMode"=NEW."paymentMode" AND upper(btrim(p.reference))=upper(btrim(NEW.reference))) THEN RAISE EXCEPTION 'This payment reference has already been recorded'; END IF;
 ELSIF TG_TABLE_NAME='SupplierPayment' THEN
  IF EXISTS(SELECT 1 FROM "SupplierPayment" p WHERE p.id<>NEW.id AND p."companyId"=NEW."companyId" AND p.status='POSTED' AND p."paymentMode"=NEW."paymentMode" AND upper(btrim(p.reference))=upper(btrim(NEW.reference))) THEN RAISE EXCEPTION 'This payment reference has already been recorded'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM "ProductionPayment" p WHERE p.id<>NEW.id AND p."companyId"=NEW."companyId" AND p.status='POSTED' AND p."paymentMode"=NEW."paymentMode" AND upper(btrim(p.reference))=upper(btrim(NEW.reference))) THEN RAISE EXCEPTION 'This weaving payment reference has already been recorded'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER customer_reference_guard BEFORE INSERT OR UPDATE ON "CustomerPayment" FOR EACH ROW EXECUTE FUNCTION reject_duplicate_payment_reference();
CREATE TRIGGER supplier_reference_guard BEFORE INSERT OR UPDATE ON "SupplierPayment" FOR EACH ROW EXECUTE FUNCTION reject_duplicate_payment_reference();
CREATE TRIGGER production_reference_guard BEFORE INSERT OR UPDATE ON "ProductionPayment" FOR EACH ROW EXECUTE FUNCTION reject_duplicate_payment_reference();
CREATE FUNCTION reject_duplicate_cheque_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('app.restoring_backup',true)='on' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD."chequeNumber"=NEW."chequeNumber" AND OLD."bankName" IS NOT DISTINCT FROM NEW."bankName" AND OLD.type=NEW.type THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW."companyId" || ':cheque:' || NEW.type::text || ':' || upper(btrim(coalesce(NEW."bankName",''))) || ':' || upper(btrim(NEW."chequeNumber")),0));
 IF EXISTS(SELECT 1 FROM "PDCCheque" p WHERE p.id<>NEW.id AND p."companyId"=NEW."companyId" AND p.type=NEW.type AND upper(btrim(coalesce(p."bankName",'')))=upper(btrim(coalesce(NEW."bankName",''))) AND upper(btrim(p."chequeNumber"))=upper(btrim(NEW."chequeNumber"))) THEN RAISE EXCEPTION 'This cheque number has already been recorded for this bank'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cheque_number_guard BEFORE INSERT OR UPDATE ON "PDCCheque" FOR EACH ROW EXECUTE FUNCTION reject_duplicate_cheque_number();
ALTER TABLE "CustomerOrderItem" ADD CHECK (quantity > 0);
ALTER TABLE "ProductionUnit" ADD CHECK ("wageRate" > 0);
ALTER TABLE "ProductionJob" ADD CHECK ("issuedQuantity" > 0 AND "consumedQuantity" >= 0 AND "returnedQuantity" >= 0 AND "consumedQuantity"+"returnedQuantity" <= "issuedQuantity");
ALTER TABLE "ProductionReceipt" ADD CHECK (meters>0 AND "yarnConsumed">0 AND wages>0 AND "yarnCost">=0);
ALTER TABLE "ProductionPayment" ADD CHECK (amount>0 AND "paymentMode" IN ('CASH','BANK'));
ALTER TABLE "PartyStockEntry" ADD CHECK (quantity<>0);
