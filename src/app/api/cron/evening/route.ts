import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureEquals } from "@/lib/secure-compare";
import { buildEveningReport } from "@/lib/evening-report";
import { deliverEvening } from "@/lib/evening-delivery";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  if (
    !process.env.CRON_SECRET ||
    !secureEquals(
      req.headers.get("authorization"),
      `Bearer ${process.env.CRON_SECRET}`,
    )
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  if (hour < 19)
    return NextResponse.json({
      status: "outside_evening_window",
      timezone: "Asia/Karachi",
    });
  const config = {
    resendKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL,
    whatsappToken: process.env.WHATSAPP_ACCESS_TOKEN,
    whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    whatsappVersion: process.env.WHATSAPP_API_VERSION,
    whatsappTemplate: process.env.WHATSAPP_TEMPLATE_NAME,
    whatsappLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE,
  };
  const emailEnabled = !!(config.resendKey && config.from),
    whatsappEnabled = !!(
      config.whatsappToken &&
      config.whatsappPhoneId &&
      config.whatsappVersion &&
      config.whatsappTemplate &&
      process.env.EVENING_WHATSAPP_TO
    );
  if (!emailEnabled && !whatsappEnabled)
    return NextResponse.json(
      {
        error:
          "Configure an email or approved WhatsApp provider before scheduling delivery",
      },
      { status: 503 },
    );
  const companies = await db.company.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  const results = [];
  for (const company of companies) {
    const report = await buildEveningReport(company.id);
    const channels: { channel: string; recipient: string; text: string }[] = [];
    if (emailEnabled && report.company.email)
      channels.push({
        channel: "EMAIL",
        recipient: report.company.email,
        text: report.text,
      });
    // One client per installation; WhatsApp destination is explicitly configured for that company.
    if (whatsappEnabled && companies.length === 1)
      channels.push({
        channel: "WHATSAPP",
        recipient: process.env.EVENING_WHATSAPP_TO!,
        text: `${report.company.name} · ${report.date}\nSales: Rs ${report.totals.sales}\nRecovery: Rs ${report.totals.recovery}\nStock cost: Rs ${report.totals.stockValue}\nBooks: ${report.balanced ? "balanced" : "review required"}\nFull note: ${process.env.NEXTAUTH_URL}/reports/evening`,
      });
    if (!channels.length)
      results.push({ companyId: company.id, status: "missing_recipient" });
    for (const target of channels) {
      const key = {
        companyId_businessDate_channel: {
          companyId: company.id,
          businessDate: report.date,
          channel: target.channel,
        },
      };
      const delivery = await db.eveningDelivery.upsert({
        where: key,
        update: {},
        create: { companyId: company.id, businessDate: report.date, ...target },
      });
      // WhatsApp has no transport idempotency key: ambiguous sends are held for human review.
      if (delivery.status === "SENDING" && target.channel === "WHATSAPP") {
        results.push({
          id: delivery.id,
          status: "check_provider_before_retry",
        });
        continue;
      }
      const claimed = await db.eveningDelivery.updateMany({
        where: {
          id: delivery.id,
          status: {
            in:
              target.channel === "EMAIL"
                ? ["PENDING", "FAILED", "SENDING"]
                : ["PENDING"],
          },
          attempts: { lt: 3 },
          OR: [
            { lastAttemptAt: null },
            { lastAttemptAt: { lt: new Date(Date.now() - 10 * 60_000) } },
          ],
        },
        data: {
          status: "SENDING",
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      if (!claimed.count) {
        results.push({ id: delivery.id, status: delivery.status });
        continue;
      }
      try {
        const providerId = await deliverEvening(delivery, config);
        await db.eveningDelivery.update({
          where: { id: delivery.id },
          data: { status: "SENT", providerId },
        });
        results.push({ id: delivery.id, status: "accepted_by_provider" });
      } catch {
        const status = target.channel === "WHATSAPP" ? "UNKNOWN" : "FAILED";
        await db.eveningDelivery.update({
          where: { id: delivery.id },
          data: { status },
        });
        results.push({ id: delivery.id, status });
      }
    }
  }
  return NextResponse.json(
    { results },
    {
      status: results.some((r) =>
        [
          "FAILED",
          "UNKNOWN",
          "missing_recipient",
          "check_provider_before_retry",
        ].includes(r.status),
      )
        ? 503
        : 200,
    },
  );
}
