import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";

// Present NUMERIC quantities as numbers to the existing forms and reports.
// All database arithmetic and conditional stock reservations remain exact NUMERIC.
const quantityResult = {
  needs: { quantity: true } as const,
  compute: (row: { quantity: Prisma.Decimal }) => Number(row.quantity),
};
function createClient(pool: Pool) {
  return new PrismaClient({ adapter: new PrismaPg(pool) }).$extends({
    result: {
      productBatch: {
        quantity: quantityResult,
        initialQuantity: {
          needs: { initialQuantity: true },
          compute: (row) => Number(row.initialQuantity),
        },
      },
      stockMovement: { quantity: quantityResult },
      inventoryImportRow: { quantity: quantityResult },
      inventoryOpeningStock: { quantity: quantityResult },
      purchaseOrderItem: { quantity: quantityResult },
      purchaseReturnItem: { quantity: quantityResult },
      saleInvoiceItem: { quantity: quantityResult },
      saleReturnItem: { quantity: quantityResult },
      quotationItem: { quantity: quantityResult },
    },
  });
}
const globalForPrisma = globalThis as unknown as {
  pool: Pool;
  prisma: ReturnType<typeof createClient>;
};
if (!globalForPrisma.pool)
  globalForPrisma.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
if (!globalForPrisma.prisma)
  globalForPrisma.prisma = createClient(globalForPrisma.pool);
export const db = globalForPrisma.prisma;
export type Transaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];
