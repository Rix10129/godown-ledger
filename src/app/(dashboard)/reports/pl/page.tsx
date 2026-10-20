import { getActiveSession } from "@/lib/session";
import { ledgerBalances } from "@/lib/accounting/ledger-report";
import { businessDate, businessDayBounds } from "@/lib/business-time";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function ProfitLoss({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "ACCOUNTANT"].includes(session.user.role))
    redirect("/desk");
  const query = await searchParams,
    today = businessDate();
  let from = today.slice(0, 7) + "-01",
    to = today;
  try {
    if (query.from) {
      businessDayBounds(query.from);
      from = query.from;
    }
    if (query.to) {
      businessDayBounds(query.to);
      to = query.to;
    }
  } catch {
    /* Keep valid defaults. */
  }
  const rows = await ledgerBalances(session.user.companyId, {
    gte: businessDayBounds(from).start,
    lt: businessDayBounds(to).end,
  });
  const revenue = -rows
      .filter((a) => a.type === "REVENUE")
      .reduce((s, a) => s + a.net, 0),
    cogs = rows.find((a) => a.code === "5000")?.net ?? 0;
  const expenses = rows.filter(
      (a) => a.type === "EXPENSE" && a.code !== "5000",
    ),
    totalExpenses = expenses.reduce((s, a) => s + a.net, 0);
  const values = [
    ["Net revenue (tax excluded; returns and discounts included)", revenue],
    ["Cost of goods sold, including direct deals", -cogs],
    ["Gross profit", revenue - cogs],
    ...expenses.map((a) => [a.name, -a.net]),
    ["Net profit", revenue - cogs - totalExpenses],
  ] as [string, number][];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Profit and loss</h1>
      <form className="flex flex-wrap gap-3">
        <label>
          From{" "}
          <input
            className="rounded border p-2"
            type="date"
            name="from"
            defaultValue={from}
          />
        </label>
        <label>
          To{" "}
          <input
            className="rounded border p-2"
            type="date"
            name="to"
            defaultValue={to}
          />
        </label>
        <button className="rounded bg-slate-900 p-2 text-white">Apply</button>
      </form>
      <p className="text-sm text-slate-500">
        Pakistan business dates. Based on posted journals, including corrections
        and reversals.
      </p>
      <table className="w-full rounded border bg-white">
        <tbody>
          {values.map(([label, value]) => (
            <tr key={label} className="border-t">
              <th className="p-4 text-left font-medium">{label}</th>
              <td className="p-4 text-right">{formatCurrency(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
