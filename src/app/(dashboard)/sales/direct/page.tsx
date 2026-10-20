import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  DirectDealForm,
  CancelDirectForm,
} from "@/components/direct-deal-form";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
export default async function DirectPage() {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "ACCOUNTANT"].includes(session.user.role))
    redirect("/sales");
  const companyId = session.user.companyId;
  const [mills, buyers, deals] = await Promise.all([
    db.supplier.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
    db.customer.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
    db.saleInvoice.findMany({
      where: { companyId, directKey: { not: null } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">Direct mill-to-buyer deals</h1>
      <p>
        The cloth goes straight from the mill to the buyer. It never enters
        godown stock.
      </p>
      <DirectDealForm
        mills={mills}
        buyers={buyers}
        requestKey={crypto.randomUUID()}
      />
      {deals.map((d) => (
        <section className="rounded border bg-white p-4" key={d.id}>
          <Link href={`/sales/${d.id}`} className="font-semibold text-blue-700">
            {d.invoiceNumber} · {d.customer?.name}
          </Link>
          <p>{d.notes}</p>
          <p>
            {formatCurrency(d.netAmount.toString())} · {d.status}
          </p>
          {d.status === "POSTED" && <CancelDirectForm id={d.id} />}
        </section>
      ))}
    </div>
  );
}
