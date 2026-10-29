-- AlterTable
ALTER TABLE "CustomerPayment" ADD COLUMN     "referenceBank" TEXT;

-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN     "referenceBank" TEXT;

-- AlterTable
ALTER TABLE "ProductionPayment" ADD COLUMN     "referenceBank" TEXT;


-- Existing duplicate references remain available for reconciliation. Reject new
-- duplicates atomically, including simultaneous requests, without deleting data.
CREATE OR REPLACE FUNCTION reject_duplicate_payment_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('app.restoring_backup', true) = 'on' THEN RETURN NEW; END IF;
 IF NEW.status::text <> 'POSTED' OR nullif(btrim(NEW.reference),'') IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.reference IS NOT DISTINCT FROM NEW.reference AND OLD."paymentMode"=NEW."paymentMode" AND OLD.status=NEW.status AND OLD."referenceBank" IS NOT DISTINCT FROM NEW."referenceBank" THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW."companyId" || ':' || TG_TABLE_NAME || ':' || NEW."paymentMode"::text || ':' || upper(btrim(NEW.reference)), 0));
 IF TG_TABLE_NAME='CustomerPayment' THEN
  IF EXISTS(SELECT 1 FROM "CustomerPayment" p WHERE p.id<>NEW.id AND p."companyId"=NEW."companyId" AND p.status='POSTED' AND p."paymentMode"=NEW."paymentMode" AND upper(btrim(p.reference))=upper(btrim(NEW.reference)) AND (nullif(btrim(p."referenceBank"),'') IS NULL OR nullif(btrim(NEW."referenceBank"),'') IS NULL OR upper(btrim(p."referenceBank"))=upper(btrim(NEW."referenceBank")))) THEN RAISE EXCEPTION 'This payment reference has already been recorded'; END IF;
 ELSIF TG_TABLE_NAME='SupplierPayment' THEN
  IF EXISTS(SELECT 1 FROM "SupplierPayment" p WHERE p.id<>NEW.id AND p."companyId"=NEW."companyId" AND p.status='POSTED' AND p."paymentMode"=NEW."paymentMode" AND upper(btrim(p.reference))=upper(btrim(NEW.reference)) AND (nullif(btrim(p."referenceBank"),'') IS NULL OR nullif(btrim(NEW."referenceBank"),'') IS NULL OR upper(btrim(p."referenceBank"))=upper(btrim(NEW."referenceBank")))) THEN RAISE EXCEPTION 'This payment reference has already been recorded'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM "ProductionPayment" p WHERE p.id<>NEW.id AND p."companyId"=NEW."companyId" AND p.status='POSTED' AND p."paymentMode"=NEW."paymentMode" AND upper(btrim(p.reference))=upper(btrim(NEW.reference)) AND (nullif(btrim(p."referenceBank"),'') IS NULL OR nullif(btrim(NEW."referenceBank"),'') IS NULL OR upper(btrim(p."referenceBank"))=upper(btrim(NEW."referenceBank")))) THEN RAISE EXCEPTION 'This weaving payment reference has already been recorded'; END IF;
 END IF;
 RETURN NEW;
END $$;
