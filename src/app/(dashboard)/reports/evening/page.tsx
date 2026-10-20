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
      <h1 className="text-2xl font-bold">Evening note</h1>
      <p>
        Today in Pakistan time. Includes direct deals and checks stock cost
        against the books.
      </p>
      <pre className="whitespace-pre-wrap rounded border bg-white p-5 text-sm leading-6">
        {report.text}
      </pre>
      <div className="flex flex-wrap gap-3">
        <a
          className="rounded bg-green-800 p-3 text-white"
          href={`https://wa.me/?text=${encodeURIComponent(report.text)}`}
          target="_blank"
          rel="noreferrer"
        >
          Share on WhatsApp
        </a>
        <a
          className="rounded bg-slate-900 p-3 text-white"
          href={`mailto:?subject=${encodeURIComponent(`${report.company.name} — evening ${report.date}`)}&body=${encodeURIComponent(report.text)}`}
        >
          Email the note
        </a>
      </div>
      <p className="text-sm text-slate-500">
        These buttons open your messaging app; press Send there. Scheduled
        delivery needs the configured email or approved WhatsApp provider.
      </p>
    </div>
  );
}
