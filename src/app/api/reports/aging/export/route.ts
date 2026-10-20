import { getReceivableAging } from "@/lib/receivable-aging-data";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorization";
import { excelResponse, type ExportColumn } from "@/lib/report-export";
import { buildWideTablePdf, type WideTableColumn } from "@/lib/wide-table-pdf";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authorization = await authorize("RECOVERY_EXPORT");
  if (!authorization.ok)
    return NextResponse.json(
      { error: authorization.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: authorization.status },
    );
  const companyId = authorization.actor.companyId;

  const rows = await getReceivableAging(companyId);
  const totals = rows.reduce(
    (t, r) => ({
      openingUnaged: t.openingUnaged + r.openingUnaged,
      invoiceCount: t.invoiceCount + r.invoiceCount,
      b0_30: t.b0_30 + r.b0_30,
      b31_60: t.b31_60 + r.b31_60,
      b61_90: t.b61_90 + r.b61_90,
      b90plus: t.b90plus + r.b90plus,
      total: t.total + r.total,
    }),
    {
      openingUnaged: 0,
      invoiceCount: 0,
      b0_30: 0,
      b31_60: 0,
      b61_90: 0,
      b90plus: 0,
      total: 0,
    },
  );

  if (req.nextUrl.searchParams.get("format") === "pdf") {
    const pdfColumns: WideTableColumn[] = [
      { header: "Customer", key: "name", weight: 22 },
      { header: "Area", key: "area", weight: 12 },
      {
        header: "Opening / undated",
        key: "openingUnaged",
        weight: 12,
        align: "right",
      },
      { header: "Inv.", key: "invoiceCount", weight: 6, align: "right" },
      { header: "0–30 Days", key: "b0_30", weight: 12, align: "right" },
      { header: "31–60 Days", key: "b31_60", weight: 12, align: "right" },
      { header: "61–90 Days", key: "b61_90", weight: 12, align: "right" },
      { header: "90+ Days", key: "b90plus", weight: 12, align: "right" },
      { header: "Total", key: "total", weight: 12, align: "right" },
    ];
    const fmt = (n: number) => (n > 0.01 ? formatCurrency(n) : "—");
    const pdfRows = rows.map((r) => ({
      name: r.name,
      area: r.area ?? "—",
      openingUnaged: fmt(r.openingUnaged),
      invoiceCount: String(r.invoiceCount),
      b0_30: fmt(r.b0_30),
      b31_60: fmt(r.b31_60),
      b61_90: fmt(r.b61_90),
      b90plus: fmt(r.b90plus),
      total: formatCurrency(r.total),
    }));
    const totalsRow = {
      name: "Grand Total",
      area: "",
      openingUnaged: fmt(totals.openingUnaged),
      invoiceCount: String(totals.invoiceCount),
      b0_30: formatCurrency(totals.b0_30),
      b31_60: formatCurrency(totals.b31_60),
      b61_90: formatCurrency(totals.b61_90),
      b90plus: formatCurrency(totals.b90plus),
      total: formatCurrency(totals.total),
    };
    const pdfBytes = await buildWideTablePdf({
      title: "Aging Report",
      subtitle: `Outstanding receivables by age, as of today · ${rows.length} customer${rows.length !== 1 ? "s" : ""}`,
      columns: pdfColumns,
      rows: pdfRows,
      totalsRow,
    });
    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aging-report.pdf"`,
      },
    });
  }

  const excelColumns: ExportColumn[] = [
    { header: "Customer", key: "name", width: 26 },
    { header: "Area", key: "area" },
    { header: "Opening / undated", key: "openingUnaged", numeric: true },
    { header: "Invoices", key: "invoiceCount", numeric: true },
    { header: "0-30 Days", key: "b0_30", numeric: true },
    { header: "31-60 Days", key: "b31_60", numeric: true },
    { header: "61-90 Days", key: "b61_90", numeric: true },
    { header: "90+ Days", key: "b90plus", numeric: true },
    { header: "Total", key: "total", numeric: true },
  ];
  const excelRows = rows.map((r) => ({
    name: r.name,
    area: r.area ?? "",
    openingUnaged: r.openingUnaged,
    invoiceCount: r.invoiceCount,
    b0_30: r.b0_30,
    b31_60: r.b31_60,
    b61_90: r.b61_90,
    b90plus: r.b90plus,
    total: r.total,
  }));
  excelRows.push({
    name: "TOTAL",
    area: "",
    openingUnaged: totals.openingUnaged,
    invoiceCount: totals.invoiceCount,
    b0_30: totals.b0_30,
    b31_60: totals.b31_60,
    b61_90: totals.b61_90,
    b90plus: totals.b90plus,
    total: totals.total,
  });
  return excelResponse("Aging Report", "aging-report", excelColumns, excelRows);
}
