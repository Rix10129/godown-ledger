import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
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
    <div className="max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">Cloth waiting for pricing</h1>
      <p>
        Review the godown keeper’s receipt, add rates and post it to stock and
        the mill’s account.
      </p>
      {receipts.map((r) => (
        <section className="rounded border bg-white p-4" key={r.id}>
          <h2 className="font-semibold">
            {r.poNumber} · {r.supplier.name}
          </h2>
          {r.items.map((i) => (
            <p key={i.id}>
              {i.product.name} · {i.quantity} {i.product.unit}
            </p>
          ))}
          <PriceReceiptForm id={r.id} />
        </section>
      ))}
      {!receipts.length && <p>All received cloth has been priced.</p>}
    </div>
  );
}
