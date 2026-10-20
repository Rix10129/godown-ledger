import { db } from "./db";
import { ageReceivable, overdueFirst } from "./receivable-aging";
export const agingRelations = {
  invoices: {
    where: { status: "POSTED" as const },
    select: { id: true, netAmount: true, invoiceDate: true, dueDate: true },
  },
  payments: {
    where: { status: "POSTED" as const },
    select: { invoiceId: true, amount: true, discountAmount: true },
  },
  saleReturns: {
    where: { status: "POSTED" as const },
    select: { invoiceId: true, totalAmount: true },
  },
};
export async function getReceivableAging(companyId: string, now = new Date()) {
  const customers = await db.customer.findMany({
    where: { companyId },
    include: agingRelations,
  });
  return customers
    .map((c) => ageReceivable(c, now))
    .filter((r) => r.total > 0)
    .sort(overdueFirst);
}
