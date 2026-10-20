import ExcelJS from "exceljs";
import Decimal from "decimal.js";
import type { buildEveningReport } from "./evening-report";
export const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
type Report = Awaited<ReturnType<typeof buildEveningReport>>;
type Value = string | number;
type Column = { label: string; width?: number; format?: "money" | "quantity" };
const num = (value: { toString(): string } | number) =>
  Number(value.toString());
export function eveningFilename(company: string, date: string) {
  const safe =
    company
      .normalize("NFKD")
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "Godown-Ledger";
  return `${safe}-evening-${date}.xlsx`;
}
/** Uses the exact data behind the evening note; stock/accounts are the current snapshot. */
export async function buildEveningWorkbook(report: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Godown Ledger";
  wb.created = new Date(report.generatedAt);
  const sheet = (name: string, columns: Column[], rows: Value[][]) => {
    const s = wb.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 5 }],
    });
    s.addRow([report.company.name]).font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: "FF225744" },
    };
    s.addRow([`${name} · ${report.date} · Asia/Karachi`]);
    s.addRow([
      `Generated ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))} PKT`,
    ]);
    s.addRow([]);
    const header = s.addRow(columns.map((c) => c.label));
    header.height = 24;
    header.eachCell((c) => {
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF225744" },
      };
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.alignment = { vertical: "middle", wrapText: true };
    });
    columns.forEach((c, i) => {
      s.getColumn(i + 1).width = c.width ?? 22;
      if (c.format)
        s.getColumn(i + 1).numFmt =
          c.format === "quantity" ? "#,##0.000" : "#,##0.00";
    });
    rows.forEach((values, i) => {
      const r = s.addRow(values);
      r.eachCell((c) => {
        c.alignment = { vertical: "top", wrapText: true };
        if (i % 2 === 1)
          c.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F3EC" },
          };
      });
    });
    if (rows.length)
      s.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: rows.length + 5, column: columns.length },
      };
    s.pageSetup = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    s.pageSetup.printTitlesRow = "1:5";
    return s;
  };
  const money = (label: string): Column => ({
    label,
    format: "money",
    width: 19,
  });
  const quantity = {
    label: "Quantity",
    format: "quantity",
    width: 17,
  } as const;
  const text = (label: string, width = 24): Column => ({ label, width });
  const {
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
  } = report.data;
  const total = (values: { toString(): string }[]) =>
    values
      .reduce<Decimal>((s, value) => s.plus(value.toString()), new Decimal(0))
      .toNumber();
  sheet(
    "Summary",
    [text("Measure", 40), text("Value", 30)],
    [
      ["Business date (Pakistan)", report.date],
      ["Net sales after buyer returns", num(report.totals.sales)],
      [
        "Purchases posted (including direct)",
        total(purchases.map((p) => p.netAmount)),
      ],
      ["Buyer returns", total(saleReturns.map((r) => r.totalAmount))],
      ["Mill returns", total(purchaseReturns.map((r) => r.totalAmount))],
      ["Recovery received", num(report.totals.recovery)],
      [
        "Recovery discounts allowed",
        total(receipts.map((r) => r.discountAmount)),
      ],
      ["Paid to mills", total(payments.map((p) => p.amount))],
      ["Current stock cost", num(report.totals.stockValue)],
      [
        "Inventory account balance",
        accounts.find((a) => a.code === "1200")?.net ?? 0,
      ],
      [
        "Books and stock check",
        report.balanced ? "BALANCED" : "REVIEW REQUIRED",
      ],
      ["Waiting for a rate", pendingReceipts.length],
      ["Stock / account timing", "Current snapshot at generation time"],
      [
        "Direct deals",
        "Included in sales and purchases; excluded from physical stock",
      ],
    ],
  ).getColumn(2).numFmt = "#,##0.00";
  const trades = (kind: "purchase" | "sale") => {
    const rows: Value[][] = [];
    if (kind === "purchase")
      for (const p of purchases)
        rows.push([
          p.poNumber,
          p.supplier.name,
          p.directDeal ? "DIRECT · no godown" : "Godown purchase",
          p.items
            .map((i) => `${i.product.name} · ${i.quantity} ${i.product.unit}`)
            .join("; ") ||
            p.notes ||
            "",
          num(p.netAmount),
          p.notes ?? "",
        ]);
    else
      for (const s of sales)
        rows.push([
          s.invoiceNumber,
          s.customer?.name ?? s.walkInCustomerName ?? "Walk-in",
          s.directDeal ? "DIRECT · no godown" : "Stock sale",
          s.items
            .map((i) => `${i.product.name} · ${i.quantity} ${i.product.unit}`)
            .join("; ") ||
            s.notes ||
            "",
          num(s.netAmount),
          s.paymentMode,
        ]);
    return rows;
  };
  sheet(
    "Purchases",
    [
      text("Purchase no."),
      text("Mill", 28),
      text("Route"),
      text("Cloth / quantity", 55),
      money("Bill amount"),
      text("Notes", 45),
    ],
    trades("purchase"),
  );
  sheet(
    "Sales",
    [
      text("Bill no."),
      text("Buyer", 28),
      text("Route"),
      text("Cloth / quantity", 55),
      money("Bill amount"),
      text("Payment mode"),
    ],
    trades("sale"),
  );
  sheet(
    "Recovery",
    [
      text("Buyer", 30),
      text("Payment mode"),
      money("Money received"),
      money("Discount allowed"),
      text("Reference"),
    ],
    receipts.map((r) => [
      r.customer.name,
      r.paymentMode,
      num(r.amount),
      num(r.discountAmount),
      r.reference ?? "",
    ]),
  );
  sheet(
    "Mill Payments",
    [
      text("Mill", 30),
      text("Payment mode"),
      money("Amount"),
      text("Reference"),
    ],
    payments.map((p) => [
      p.supplier.name,
      p.paymentMode,
      num(p.amount),
      p.reference ?? "",
    ]),
  );
  sheet(
    "Stock",
    [
      text("Cloth", 35),
      text("Lot / thaan"),
      text("Mill", 28),
      quantity,
      text("Unit", 12),
      money("Unit cost"),
      money("Cost value"),
    ],
    batches.map((b) => [
      b.product.name,
      b.batchNumber,
      b.product.supplier?.name ?? "",
      num(b.quantity),
      b.product.unit,
      num(b.purchasePrice),
      new Decimal(b.quantity)
        .times(b.purchasePrice.toString())
        .toDecimalPlaces(2)
        .toNumber(),
    ]),
  );
  wb.getWorksheet("Stock")!.getColumn(6).numFmt = "#,##0.00######";
  sheet(
    "Returns",
    [
      text("Direction"),
      text("Return no."),
      text("Buyer / mill", 30),
      money("Credit / refund"),
    ],
    [
      ...saleReturns.map((r) => [
        "Buyer return",
        r.returnNumber,
        r.customer?.name ?? "Walk-in",
        num(r.totalAmount),
      ]),
      ...purchaseReturns.map((r) => [
        "Mill return",
        r.returnNumber,
        r.supplier.name,
        num(r.totalAmount),
      ]),
    ],
  );
  sheet(
    "Waiting for Rate",
    [
      text("Receipt no."),
      text("Mill", 30),
      text("Cloth", 35),
      quantity,
      text("Unit", 12),
      text("Status", 30),
    ],
    pendingReceipts.flatMap((p) =>
      p.items.map((i) => [
        p.poNumber,
        p.supplier.name,
        i.product.name,
        num(i.quantity),
        i.product.unit,
        "Not yet available to sell",
      ]),
    ),
  );
  sheet(
    "Buyer Dues",
    [
      text("Buyer", 30),
      text("Area"),
      money("Outstanding"),
      { label: "Oldest overdue days", width: 20 },
      money("Opening / undated"),
      money("Current / 0–30 days"),
      money("31–60 days"),
      money("61–90 days"),
      money("90+ days"),
    ],
    buyerDues.map((r) => [
      r.name,
      r.area ?? "",
      r.total,
      r.oldestDueDays >= 0 ? r.oldestDueDays : "Undated",
      r.openingUnaged,
      r.b0_30,
      r.b31_60,
      r.b61_90,
      r.b90plus,
    ]),
  );
  sheet(
    "Accounts",
    [
      text("Code", 12),
      text("Account", 36),
      text("Type"),
      money("Total debits"),
      money("Total credits"),
      money("Net debit balance"),
    ],
    accounts.map((a) => [a.code, a.name, a.type, a.debit, a.credit, a.net]),
  );
  sheet(
    "Evening Note",
    [text("Office note", 110)],
    report.text.split("\n").map((line) => [line]),
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}
