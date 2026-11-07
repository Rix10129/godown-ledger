ALTER TABLE "CustomerOrderItem" ADD COLUMN "rate" DECIMAL(12,2);
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_rate_positive" CHECK ("rate" IS NULL OR "rate" > 0);
