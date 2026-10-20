import { getActiveSession } from "@/lib/session";
import { ledgerBalances } from "@/lib/accounting/ledger-report";
import { businessDate } from "@/lib/business-time";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function BalanceSheet() {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "ACCOUNTANT"].includes(session.user.role))
    redirect("/desk");
  const rows = await ledgerBalances(session.user.companyId);
  const assets = rows.filter((a) => a.type === "ASSET"),
    liabilities = rows.filter((a) => a.type === "LIABILITY"),
    equity = rows.filter((a) => a.type === "EQUITY");
  const earnings = -rows
    .filter((a) => a.type === "REVENUE" || a.type === "EXPENSE")
    .reduce((s, a) => s + a.net, 0);
  const assetTotal = assets.reduce((s, a) => s + a.net, 0),
    liabilityTotal = -liabilities.reduce((s, a) => s + a.net, 0),
    equityTotal = -equity.reduce((s, a) => s + a.net, 0) + earnings;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Balance sheet</h1>
      <p>As of {businessDate()} · Pakistan time</p>
      {[
        ["Assets", assets, 1],
        ["Liabilities", liabilities, -1],
        ["Equity", equity, -1],
      ].map(([label, items, sign]) => (
        <section key={String(label)} className="rounded border bg-white p-4">
          <h2 className="mb-3 font-semibold">{String(label)}</h2>
          {(items as typeof rows).map((a) => (
            <p key={a.id} className="flex justify-between py-1">
              <span>{a.name}</span>
              <span>{formatCurrency(a.net * Number(sign))}</span>
            </p>
          ))}
          {label === "Equity" && (
            <p className="flex justify-between">
              <span>Accumulated earnings</span>
              <span>{formatCurrency(earnings)}</span>
            </p>
          )}
        </section>
      ))}
      <p>Total assets: {formatCurrency(assetTotal)}</p>
      <p>
        Liabilities and equity: {formatCurrency(liabilityTotal + equityTotal)}
      </p>
      <p
        className={
          Math.abs(assetTotal - liabilityTotal - equityTotal) < 0.01
            ? "text-green-700"
            : "text-red-700"
        }
      >
        {Math.abs(assetTotal - liabilityTotal - equityTotal) < 0.01
          ? "Books balanced"
          : "Books out of balance — review the trial balance"}
      </p>
    </div>
  );
}
