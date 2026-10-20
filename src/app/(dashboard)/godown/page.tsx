import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ClothReceiptForm } from "@/components/godown-forms";
export default async function GodownPage() {
  const session = await getActiveSession();
  if (
    !session?.user ||
    !["OWNER", "STOREKEEPER", "ACCOUNTANT"].includes(session.user.role)
  )
    redirect("/desk");
  const companyId = session.user.companyId;
  // Deliberately select only physical stock data: no rates or money sent to the keeper.
  const [lots, mills, products, waiting] = await Promise.all([
    db.productBatch.findMany({
      where: { companyId, quantity: { gt: 0 } },
      select: {
        id: true,
        batchNumber: true,
        quantity: true,
        product: {
          select: {
            name: true,
            unit: true,
            supplier: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.supplier.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
    db.product.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, unit: true },
    }),
    db.purchaseOrder.findMany({
      where: {
        companyId,
        status: "DRAFT",
        notes: { contains: "unpriced-receipt" },
      },
      select: {
        id: true,
        poNumber: true,
        items: {
          select: {
            quantity: true,
            product: { select: { name: true, unit: true } },
          },
        },
      },
    }),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Godown stock</h1>
      {session.user.role !== "ACCOUNTANT" && (
        <section className="rounded border bg-white p-4">
          <h2 className="mb-4 font-semibold">Cloth received</h2>
          <ClothReceiptForm mills={mills} products={products} />
          {!products.length && (
            <p className="mt-3 text-sm">
              The owner or bookkeeper must add products under Inventory first.
            </p>
          )}
        </section>
      )}
      <div className="overflow-x-auto">
        <table className="w-full rounded border bg-white text-left">
          <thead>
            <tr>
              <th className="p-3">Cloth</th>
              <th>Lot / thaan</th>
              <th>Mill</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{l.product.name}</td>
                <td>{l.batchNumber}</td>
                <td>{l.product.supplier?.name ?? "—"}</td>
                <td>
                  {l.quantity} {l.product.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!lots.length && <p>No priced stock yet.</p>}
      <h2 className="font-semibold">Waiting for a rate</h2>
      {waiting.map((r) => (
        <p key={r.id}>
          {r.poNumber} ·{" "}
          {r.items
            .map((i) => `${i.product.name} ${i.quantity} ${i.product.unit}`)
            .join(", ")}
        </p>
      ))}
    </div>
  );
}
