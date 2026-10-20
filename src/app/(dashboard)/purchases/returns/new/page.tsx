import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  PurchaseReturnForm,
  type ReturnProductOption,
} from "@/components/purchases/purchase-return-form";
export default async function PurchaseReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ purchaseOrderId?: string }>;
}) {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "ACCOUNTANT"].includes(session.user.role))
    redirect("/desk");
  const companyId = session.user.companyId,
    { purchaseOrderId } = await searchParams;
  if (!purchaseOrderId) {
    const purchases = await db.purchaseOrder.findMany({
      where: { companyId, status: "POSTED" },
      select: {
        id: true,
        poNumber: true,
        directDeal: true,
        supplier: { select: { name: true } },
      },
      orderBy: { orderDate: "desc" },
      take: 100,
    });
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Return cloth to a mill</h1>
        <p>
          Choose the original purchase. For older purchases, open the purchase
          and press Return.
        </p>
        {purchases
          .filter((p) => !p.directDeal)
          .map((p) => (
            <p key={p.id}>
              <Link
                className="text-blue-700 underline"
                href={`/purchases/returns/new?purchaseOrderId=${p.id}`}
              >
                {p.poNumber} · {p.supplier.name}
              </Link>
            </p>
          ))}
      </div>
    );
  }
  const purchase = await db.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, companyId, status: "POSTED" },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: true, batch: true } },
      returns: { where: { status: "POSTED" }, include: { items: true } },
    },
  });
  if (!purchase || purchase.directDeal) notFound();
  const byProduct = new Map<string, ReturnProductOption>();
  for (const item of purchase.items) {
    if (!item.batch) continue;
    const returned = purchase.returns
      .flatMap((r) => r.items)
      .filter((i) => i.batchId === item.batchId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const available = Math.min(item.batch.quantity, item.quantity - returned);
    if (available <= 0.0000001) continue;
    const product = byProduct.get(item.productId) ?? {
      id: item.productId,
      name: item.product.name,
      unit: item.product.unit,
      batches: [],
    };
    product.batches.push({
      id: item.batch.id,
      batchNumber: item.batch.batchNumber,
      expiryDate: item.batch.expiryDate?.toISOString() ?? null,
      quantity: available,
      purchasePrice: item.batch.purchasePrice.toString(),
    });
    byProduct.set(item.productId, product);
  }
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-bold">Return against {purchase.poNumber}</h1>
      <p>
        This is a credit note to the mill’s account. The server uses the
        original lot cost and tax, and prevents returning unavailable or already
        returned cloth.
      </p>
      <PurchaseReturnForm
        products={[...byProduct.values()]}
        suppliers={[purchase.supplier]}
        defaultSupplierId={purchase.supplierId}
        defaultPurchaseOrderId={purchase.id}
      />
    </div>
  );
}
