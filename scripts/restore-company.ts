/** Restores an authenticated office backup only into a completely EMPTY, migrated database. */
import fs from "node:fs";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  decryptBackup,
  validateRestoredBackup,
  type BackupCollection,
} from "../src/lib/company-backup";

const models: Partial<Record<BackupCollection, string>> = {
  company: "company",
  users: "user",
  documentSequences: "documentSequence",
  suppliers: "supplier",
  customers: "customer",
  categories: "category",
  products: "product",
  batches: "productBatch",
  stockMovements: "stockMovement",
  purchases: "purchaseOrder",
  purchaseItems: "purchaseOrderItem",
  purchaseReturns: "purchaseReturn",
  purchaseReturnItems: "purchaseReturnItem",
  invoices: "saleInvoice",
  invoiceItems: "saleInvoiceItem",
  saleReturns: "saleReturn",
  saleReturnItems: "saleReturnItem",
  customerPayments: "customerPayment",
  supplierPayments: "supplierPayment",
  accounts: "account",
  journalEntries: "journalEntry",
  journalLines: "journalLine",
  pdcCheques: "pDCCheque",
  expenses: "expense",
  salesTargets: "salesTarget",
  routes: "route",
  routeVisits: "routeVisit",
  quotations: "quotation",
  quotationItems: "quotationItem",
  supplierPaymentSchedules: "supplierPaymentSchedule",
  invoiceDrafts: "invoiceDraft",
  auditLogs: "auditLog",
  inventoryImports: "inventoryImport",
  inventoryImportRows: "inventoryImportRow",
  inventoryOpeningStocks: "inventoryOpeningStock",
  eveningDeliveries: "eveningDelivery",
};
const order: BackupCollection[] = [
  "company",
  "users",
  "documentSequences",
  "suppliers",
  "customers",
  "categories",
  "products",
  "batches",
  "purchases",
  "purchaseItems",
  "purchaseReturns",
  "purchaseReturnItems",
  "invoices",
  "invoiceItems",
  "saleReturns",
  "saleReturnItems",
  "customerPayments",
  "supplierPayments",
  "accounts",
  "journalEntries",
  "journalLines",
  "pdcCheques",
  "expenses",
  "salesTargets",
  "routes",
  "routeVisits",
  "quotations",
  "quotationItems",
  "supplierPaymentSchedules",
  "invoiceDrafts",
  "inventoryImports",
  "inventoryImportRows",
  "inventoryOpeningStocks",
  "stockMovements",
  "auditLogs",
  "eveningDeliveries",
];
async function main() {
  const args = process.argv.slice(2),
    filename = args[args.indexOf("--file") + 1];
  if (
    !args.includes("--empty-database") ||
    !args.includes("--file") ||
    !filename ||
    !process.env.RESTORE_DATABASE_URL ||
    !process.env.BACKUP_ENCRYPTION_KEY
  )
    throw new Error(
      "Use --empty-database --file <encrypted-backup>, RESTORE_DATABASE_URL, and BACKUP_ENCRYPTION_KEY. The target must be empty and migrated.",
    );
  const backup = decryptBackup(
    JSON.parse(fs.readFileSync(filename, "utf8")),
    process.env.BACKUP_ENCRYPTION_KEY,
  );
  const validation = validateRestoredBackup(backup);
  if (!validation.ok)
    throw new Error(
      `Backup failed validation: ${validation.errors.join("; ")}`,
    );
  const pool = new Pool({ connectionString: process.env.RESTORE_DATABASE_URL }),
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(172952, 10129)`;
        if (
          (await tx.company.count()) ||
          (await tx.user.count()) ||
          (await tx.deskSession.count())
        )
          throw new Error(
            "Target contains data. Refusing to overwrite or merge an existing installation.",
          );
        for (const collection of order) {
          const name = models[collection]!;
          const model = Prisma.dmmf.datamodel.models.find(
            (m) => m.name.toLowerCase() === name.toLowerCase(),
          )!;
          const jsonFields = new Set(
            model.fields.filter((f) => f.type === "Json").map((f) => f.name),
          );
          const fields = new Set(
            model.fields.filter((f) => f.kind !== "object").map((f) => f.name),
          );
          for (const raw of (backup.data[collection] ?? []) as Record<
            string,
            unknown
          >[]) {
            const row = Object.fromEntries(
              Object.entries(raw)
                .filter(([field]) => fields.has(field))
                .map(([field, value]) => [
                  field,
                  value === null && jsonFields.has(field)
                    ? Prisma.DbNull
                    : value,
                ]),
            );
            // Authenticated desk sessions are intentionally not restored.
            if (collection === "users") {
              row.activeSessionId = null;
              row.pinFailures = 0;
              row.pinLockedUntil = null;
            }
            if (collection === "journalEntries") row.reversesEntryId = null;
            if (collection === "accounts") row.parentId = null;
            if (collection === "customers") row.routeId = null;
            const delegate = (
              tx as unknown as Record<
                string,
                { create: (args: { data: unknown }) => Promise<unknown> }
              >
            )[name];
            await delegate.create({ data: row });
          }
        }
        // Resolve self references after all parent records have been created.
        for (const row of backup.data.accounts as Record<string, unknown>[])
          if (row.parentId)
            await tx.account.update({
              where: { id: String(row.id) },
              data: { parentId: String(row.parentId) },
            });
        for (const row of backup.data.customers as Record<string, unknown>[])
          if (row.routeId)
            await tx.customer.update({
              where: { id: String(row.id) },
              data: { routeId: String(row.routeId) },
            });
        for (const row of backup.data.journalEntries as Record<
          string,
          unknown
        >[])
          if (row.reversesEntryId)
            await tx.journalEntry.update({
              where: { id: String(row.id) },
              data: { reversesEntryId: String(row.reversesEntryId) },
            });
        for (const collection of order) {
          const delegate = (
            tx as unknown as Record<string, { count: () => Promise<number> }>
          )[models[collection]!];
          const count = await delegate.count();
          if (count !== (backup.data[collection]?.length ?? 0))
            throw new Error(`Restored ${collection} count mismatch`);
        }
      },
      { timeout: 120000 },
    );
    console.log(
      "Backup restored transactionally to the empty target. Counts verified. Verify business balances and PIN login before switching the live connection.",
    );
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Restore failed");
  process.exitCode = 1;
});
