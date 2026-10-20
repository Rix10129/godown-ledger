import { businessDate, businessDayBounds } from "@/lib/business-time";
import { redirect } from "next/navigation";
import { homeForRole } from "@/lib/desk-access";
import { calculateCustomerBalance } from "@/lib/customer-ledger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Package,
  Receipt,
  Moon,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { OfficeHeading, EmptyState } from "@/components/office-design";

export const dynamic = "force-dynamic";

async function getStats(companyId: string) {
  const now = new Date();
  const todayStart = businessDayBounds().start;
  const monthStart = businessDayBounds(
    businessDate().slice(0, 7) + "-01",
  ).start;
  const in90 = new Date(now.getTime() + 90 * 86400_000);

  const [
    todayInvoices,
    monthInvoices,
    allCustomers,
    totalProducts,
    expiringBatches,
    products,
    recentInvoices,
    todayRecovery,
  ] = await Promise.all([
    db.saleInvoice.aggregate({
      where: { companyId, status: "POSTED", invoiceDate: { gte: todayStart } },
      _sum: { netAmount: true },
      _count: true,
    }),
    db.saleInvoice.aggregate({
      where: { companyId, status: "POSTED", invoiceDate: { gte: monthStart } },
      _sum: { netAmount: true },
      _count: true,
    }),
    db.customer.findMany({
      where: { companyId },
      select: {
        openingBalance: true,
        invoices: { where: { status: "POSTED" }, select: { netAmount: true } },
        payments: {
          where: { status: "POSTED" },
          select: { amount: true, discountAmount: true },
        },
        saleReturns: {
          where: { status: "POSTED" },
          select: { totalAmount: true },
        },
      },
    }),
    db.product.count({ where: { companyId, isActive: true } }),
    db.productBatch.count({
      where: { companyId, expiryDate: { lte: in90 }, quantity: { gt: 0 } },
    }),
    db.product.findMany({
      where: { companyId, isActive: true },
      select: { reorderLevel: true, batches: { select: { quantity: true } } },
    }),
    db.saleInvoice.findMany({
      where: { companyId, status: "POSTED" },
      orderBy: { invoiceDate: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        netAmount: true,
        paidAmount: true,
        returns: { where: { status: "POSTED" }, select: { totalAmount: true } },
        payments: {
          where: { status: "POSTED" },
          select: { amount: true, discountAmount: true },
        },
        customer: { select: { name: true } },
      },
    }),
    db.customerPayment.aggregate({
      where: { companyId, status: "POSTED", paymentDate: { gte: todayStart } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalReceivables = allCustomers.reduce((sum, c) => {
    return (
      sum +
      calculateCustomerBalance({
        openingBalance: c.openingBalance,
        invoices: c.invoices,
        payments: c.payments,
        returns: c.saleReturns,
      }).closingBalance
    );
  }, 0);

  const lowStockCount = products.filter(
    (p) => p.batches.reduce((s, b) => s + b.quantity, 0) <= p.reorderLevel,
  ).length;

  return {
    todaySales: parseFloat(todayInvoices._sum.netAmount?.toString() ?? "0"),
    todayCount: todayInvoices._count,
    todayRecovery: Number(todayRecovery._sum.amount ?? 0),
    recoveryCount: todayRecovery._count,
    monthSales: parseFloat(monthInvoices._sum.netAmount?.toString() ?? "0"),
    monthCount: monthInvoices._count,
    totalReceivables: Math.max(0, totalReceivables),
    totalProducts,
    alertCount: expiringBatches + lowStockCount,
    recentInvoices,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/desk");
  if (session.user.role !== "OWNER") redirect(homeForRole(session.user.role));
  const companyId = (session?.user as any)?.companyId as string | undefined;
  const stats = companyId ? await getStats(companyId) : null;
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <OfficeHeading
        kicker="01 / The day book"
        title="A clear view of the day."
        action={
          <Link href="/reports/evening" className="office-button-quiet">
            <Moon className="h-4 w-4" />
            Evening note
          </Link>
        }
      >
        Welcome, {firstName}. Mills, stock, bills and recovery, together in your
        office book.
      </OfficeHeading>
      <div className="office-metrics">
        <Link href="/sales" className="office-metric">
          <p>Bills issued today</p>
          <strong>{stats ? formatCurrency(stats.todaySales) : "—"}</strong>
          <small>{stats?.todayCount ?? 0} bills · Pakistan time</small>
        </Link>
        <Link href="/reports/recovery" className="office-metric">
          <p>Recovery received today</p>
          <strong>{stats ? formatCurrency(stats.todayRecovery) : "—"}</strong>
          <small>{stats?.recoveryCount ?? 0} receipts</small>
        </Link>
        <Link href="/reports/recovery" className="office-metric">
          <p>Buyers’ outstanding</p>
          <strong>
            {stats ? formatCurrency(stats.totalReceivables) : "—"}
          </strong>
          <small>Open balances from buyers</small>
        </Link>
      </div>
      <section className="office-panel">
        <div className="office-panel-head">
          <h2>What would you like to do?</h2>
        </div>
        <div className="office-panel-body grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/sales/new",
              label: "Write a bill",
              body: "Cash sale or udhar",
              icon: FileText,
            },
            {
              href: "/reports/recovery",
              label: "Record recovery",
              body: "Money received from a buyer",
              icon: Receipt,
            },
            {
              href: "/godown#receive-cloth",
              label: "Receive cloth",
              body: "Record a mill delivery",
              icon: Package,
            },
            {
              href: "/reports/evening",
              label: "Evening note",
              body: "The day, ready to share",
              icon: Moon,
            },
          ].map((item) => (
            <Link href={item.href} key={item.href} className="office-shortcut">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span>
                {item.label}
                <small>{item.body}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
      {stats?.totalProducts === 0 && (
        <section className="office-panel">
          <div className="office-panel-head">
            <h2>Get the office ready</h2>
            <span className="office-status">First day</span>
          </div>
          <div className="divide-y divide-slate-200 px-5">
            {[
              {
                href: "/people",
                title: "Add people and their own PINs",
                body: "Each person opens their own work.",
              },
              {
                href: "/inventory/new",
                title: "Add mills, cloth products and buyers",
                body: "Prepare the names used on daily entries.",
              },
              {
                href: "/accounts",
                title: "Agree and enter opening figures",
                body: "Use the owner’s approved figures from the manual books.",
              },
            ].map((item, i) => (
              <Link
                href={item.href}
                key={item.href}
                className="flex items-center gap-3 py-4"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-300 text-xs text-blue-600">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm">
                  {item.title}
                  <small className="office-note block">{item.body}</small>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="office-panel">
          <div className="office-panel-head">
            <h2>Recent bills</h2>
            <Link
              href="/sales"
              className="flex items-center gap-1 text-xs text-blue-600"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!stats?.recentInvoices.length ? (
            <EmptyState title="The day book is ready">
              Your latest bills will appear here as the office starts its work.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-3">Bill / date</th>
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.recentInvoices.map((inv) => {
                    const net = Number(inv.netAmount);
                    const paid = inv.customer
                      ? inv.payments.reduce(
                          (sum, p) =>
                            sum + Number(p.amount) + Number(p.discountAmount),
                          0,
                        )
                      : Number(inv.paidAmount);
                    const credited = inv.returns.reduce(
                      (sum, r) => sum + Number(r.totalAmount),
                      0,
                    );
                    const balance = net - paid - (inv.customer ? credited : 0);
                    return (
                      <tr key={inv.id}>
                        <td className="px-5 py-4">
                          <Link
                            href={`/sales/${inv.id}`}
                            className="font-mono text-xs font-semibold text-blue-600"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {formatDate(inv.invoiceDate)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          {inv.customer?.name ?? "Walk-in"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm tabular-nums">
                          {formatCurrency(net)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Badge
                            variant={
                              balance <= 0.001
                                ? "success"
                                : paid > 0.001 || credited > 0.001
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {balance <= 0.001
                              ? "Settled"
                              : paid > 0.001 || credited > 0.001
                                ? "Partial"
                                : "Unpaid"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="office-panel">
          <div className="office-panel-head">
            <h2>Office at a glance</h2>
          </div>
          <div className="office-panel-body space-y-5">
            <Link href="/reports/sales" className="block">
              <p className="office-note">Bills this month</p>
              <p className="mt-1 text-lg tabular-nums">
                {stats ? formatCurrency(stats.monthSales) : "—"}
              </p>
              <p className="office-note">{stats?.monthCount ?? 0} bills</p>
            </Link>
            <Link
              href="/alerts"
              className="flex items-center gap-2 border-t border-slate-200 pt-4 text-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              {stats?.alertCount
                ? `${stats.alertCount} stock alerts to review`
                : "No stock alerts to review"}
              <ArrowRight className="ml-auto h-3 w-3" />
            </Link>
            <Link
              href="/sales/direct"
              className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm"
            >
              Direct mill-to-buyer deals
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
