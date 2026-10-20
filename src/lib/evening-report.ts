import { db } from "@/lib/db";
import { businessDate, businessDayBounds } from "./business-time";
import { eveningCloseText } from "./evening-close";
import { formatCurrency } from "./utils";
import Decimal from "decimal.js";
import { getReceivableAging } from "./receivable-aging-data";
import { ledgerBalances } from "./accounting/ledger-report";
export async function buildEveningReport(companyId: string, now = new Date()) {
  const date = businessDate(now),
    { start, end } = businessDayBounds(date);
  const [
    company,
    purchases,
    sales,
    receipts,
    payments,
    batches,
    accounts,
    saleReturns,
    purchaseReturns,
    pendingReceipts,
    buyerDues,
  ] = await Promise.all([
    db.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true, address: true, email: true },
    }),
    db.purchaseOrder.findMany({
      where: {
        companyId,
        status: "POSTED",
        orderDate: { gte: start, lt: end },
      },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
    }),
    db.saleInvoice.findMany({
      where: {
        companyId,
        status: "POSTED",
        invoiceDate: { gte: start, lt: end },
      },
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
    }),
    db.customerPayment.findMany({
      where: {
        companyId,
        status: "POSTED",
        paymentDate: { gte: start, lt: end },
      },
      include: { customer: { select: { name: true } } },
    }),
    db.supplierPayment.findMany({
      where: {
        companyId,
        status: "POSTED",
        isVoided: false,
        paymentDate: { gte: start, lt: end },
      },
      include: { supplier: { select: { name: true } } },
    }),
    db.productBatch.findMany({
      where: { companyId, quantity: { gt: 0 } },
      select: {
        batchNumber: true,
        quantity: true,
        purchasePrice: true,
        product: {
          select: {
            name: true,
            unit: true,
            supplier: { select: { name: true } },
          },
        },
      },
    }),
    ledgerBalances(companyId),
    db.saleReturn.findMany({
      where: {
        companyId,
        status: "POSTED",
        returnDate: { gte: start, lt: end },
      },
      include: { customer: { select: { name: true } } },
    }),
    db.purchaseReturn.findMany({
      where: {
        companyId,
        status: "POSTED",
        returnDate: { gte: start, lt: end },
      },
      include: { supplier: { select: { name: true } } },
    }),
    db.purchaseOrder.findMany({
      where: {
        companyId,
        status: "DRAFT",
        notes: { contains: "unpriced-receipt" },
      },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
    }),
    getReceivableAging(companyId, now),
  ]);
  const money = (value: { toString(): string } | number) =>
    formatCurrency(value.toString());
  const units = new Map<string, Decimal>();
  let stockValue = new Decimal(0),
    debit = new Decimal(0),
    credit = new Decimal(0);
  for (const batch of batches) {
    units.set(
      batch.product.unit,
      (units.get(batch.product.unit) ?? new Decimal(0)).plus(batch.quantity),
    );
    stockValue = stockValue.plus(
      new Decimal(batch.quantity).times(batch.purchasePrice.toString()),
    );
  }
  for (const account of accounts) {
    debit = debit.plus(account.debit);
    credit = credit.plus(account.credit);
  }
  const inventoryBalance = new Decimal(
    accounts.find((a) => a.code === "1200")?.net ?? 0,
  );
  const balanced =
    debit.equals(credit) && inventoryBalance.minus(stockValue).abs().lt("0.02");
  const text = eveningCloseText({
    firm: company.name,
    place: company.address ?? "",
    dateLabel: date,
    purchases: purchases.map((p) => ({
      label: `${p.poNumber} · ${p.supplier.name}`,
      detail: p.directDeal
        ? `DIRECT — never stocked · ${p.notes} · ${money(p.netAmount)}`
        : `${p.items.map((i) => `${i.product.name} ${i.quantity} ${i.product.unit}`).join(", ")} · ${money(p.netAmount)}`,
    })),
    sales: sales.map((s) => ({
      label: `${s.invoiceNumber} · ${s.customer?.name ?? s.walkInCustomerName ?? "Walk-in buyer"}`,
      detail: `${s.directDeal ? "DIRECT — never stocked · " + s.notes : s.items.map((i) => `${i.product.name} ${i.quantity} ${i.product.unit}`).join(", ")} · ${money(s.netAmount)}`,
    })),
    saleReturns: saleReturns.map((r) => ({
      label: `${r.returnNumber} · ${r.customer?.name ?? "Walk-in buyer"}`,
      detail: money(r.totalAmount),
    })),
    purchaseReturns: purchaseReturns.map((r) => ({
      label: `${r.returnNumber} · ${r.supplier.name}`,
      detail: money(r.totalAmount),
    })),
    waitingForPrice: pendingReceipts.map((r) => ({
      label: `${r.poNumber} · ${r.supplier.name}`,
      detail: r.items
        .map((i) => `${i.product.name} ${i.quantity} ${i.product.unit}`)
        .join(", "),
    })),
    recovery: receipts.map((r) => ({
      label: r.customer.name,
      detail: money(r.amount),
    })),
    paidToMills: payments.map((p) => ({
      label: p.supplier.name,
      detail: money(p.amount),
    })),
    stock:
      [...units]
        .map(([unit, quantity]) => `${quantity.toString()} ${unit}`)
        .join(" · ") + ` · cost ${money(stockValue.toFixed(2))}`,
    booksBalanced: balanced,
  });
  return {
    text,
    date,
    generatedAt: now.toISOString(),
    data: {
      purchases,
      sales,
      receipts,
      payments,
      batches,
      accounts,
      saleReturns,
      purchaseReturns,
      pendingReceipts,
      buyerDues,
    },
    company,
    balanced,
    totals: {
      sales: sales
        .reduce((s, r) => s.plus(r.netAmount.toString()), new Decimal(0))
        .minus(
          saleReturns.reduce(
            (s, r) => s.plus(r.totalAmount.toString()),
            new Decimal(0),
          ),
        )
        .toFixed(2),
      recovery: receipts
        .reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
        .toFixed(2),
      stockValue: stockValue.toFixed(2),
    },
  };
}
