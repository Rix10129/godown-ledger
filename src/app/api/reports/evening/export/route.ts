import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";
import { businessDate } from "@/lib/business-time";
import { buildEveningReport } from "@/lib/evening-report";
import {
  buildEveningWorkbook,
  eveningFilename,
  EXCEL_MIME,
} from "@/lib/evening-workbook";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const session = await getActiveSession();
  if (!session?.user)
    return NextResponse.json(
      { error: "Open your desk first" },
      { status: 401 },
    );
  if (!["OWNER", "ACCOUNTANT"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const now = new Date();
  const date = req.nextUrl.searchParams.get("date");
  if (date && date !== businessDate(now))
    return NextResponse.json(
      {
        error:
          "The business date changed. Refresh the evening note and try again.",
      },
      { status: 409 },
    );
  const report = await buildEveningReport(session.user.companyId, now);
  const bytes = await buildEveningWorkbook(report);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": EXCEL_MIME,
      "Content-Disposition": `attachment; filename="${eveningFilename(report.company.name, report.date)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
