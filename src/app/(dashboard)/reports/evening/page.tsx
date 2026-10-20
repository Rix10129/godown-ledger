import { EveningShare } from "@/components/reports/evening-share";
import { OfficeHeading } from "@/components/office-design";
import { getActiveSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { buildEveningReport } from "@/lib/evening-report";
export const dynamic = "force-dynamic";
export default async function EveningPage() {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "ACCOUNTANT"].includes(session.user.role))
    redirect("/desk");
  const report = await buildEveningReport(session.user.companyId);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <OfficeHeading kicker="05 / Evening & reports" title="Evening note">
        Today in Pakistan time. Direct deals, recovery, returns and the stock
        check, ready to share.
      </OfficeHeading>
      <pre className="office-panel whitespace-pre-wrap break-words p-5 font-mono text-xs leading-7 sm:p-7 sm:text-sm">
        {report.text}
      </pre>
      <EveningShare
        text={report.text}
        date={report.date}
        companyName={report.company.name}
      />
      <div className="flex flex-wrap gap-3">
        <a
          className="office-button-quiet"
          href={`mailto:?subject=${encodeURIComponent(`${report.company.name} — evening ${report.date}`)}&body=${encodeURIComponent(report.text)}`}
        >
          Email the note
        </a>
      </div>
      <p className="text-sm text-slate-500">
        Choose the recipient and press Send in your messaging app. Email the
        note opens a text email; attach the downloaded Excel file yourself.
        Scheduled delivery needs a configured provider and scheduler.
      </p>
    </div>
  );
}
