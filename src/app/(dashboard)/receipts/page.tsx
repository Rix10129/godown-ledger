import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OfficeHeading, EmptyState } from "@/components/office-design";
import { PriceReceiptForm } from "@/components/godown-forms";
export default async function ReceiptsPage() {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "ACCOUNTANT"].includes(session.user.role))
    redirect("/desk");
  const receipts = await db.purchaseOrder.findMany({
    where: {
      companyId: session.user.companyId,
      status: "DRAFT",
      notes: { contains: "unpriced-receipt" },
    },
    include: {
      supplier: { select: { name: true } },
      items: { include: { product: { select: { name: true, unit: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="space-y-6">
      <OfficeHeading
        kicker="02 / Godown & mills"
        title="Cloth waiting for pricing"
        action={
          <Link href="/godown" className="office-button-quiet">
            View stock
          </Link>
        }
      >
        Review each delivery, add its rates, and post it to stock and the mill’s
        account.
      </OfficeHeading>
      {receipts.map((r) => (
        <section className="office-panel" key={r.id}>
          <div className="office-panel-head">
            <h2>{r.supplier.name}</h2>
            <span className="office-status office-status-waiting">
              Waiting for a rate
            </span>
          </div>
          <div className="office-panel-body">
            <p className="mb-2 font-mono text-xs text-blue-600">{r.poNumber}</p>
            {r.items.map((i) => (
              <p className="text-sm" key={i.id}>
                {i.product.name} ·{" "}
                <span className="font-medium tabular-nums">
                  {i.quantity} {i.product.unit}
                </span>
              </p>
            ))}
            <PriceReceiptForm id={r.id} />
          </div>
        </section>
      ))}
      {!receipts.length && (
        <section className="office-panel">
          <EmptyState title="All received cloth has been priced">
            Any new receipt saved by the keeper will appear here for your
            review.
          </EmptyState>
        </section>
      )}
    </div>
  );
}
