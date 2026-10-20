import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  SaleReturnForm,
  type ReturnProductOption,
} from "@/components/sales/sale-return-form";
export default async function SaleReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "ACCOUNTANT"].includes(session.user.role))
    redirect("/desk");
  const companyId = session.user.companyId,
    { invoiceId } = await searchParams;
  if (!invoiceId) {
    const invoices = await db.saleInvoice.findMany({
      where: { companyId, status: "POSTED", directKey: null },
      select: {
        id: true,
        invoiceNumber: true,
        customer: { select: { name: true } },
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    });
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Return sold cloth</h1>
        <p>
          Choose the original bill. For older bills, open the bill under Sales
          and press Return.
        </p>
        {invoices.map((i) => (
          <p key={i.id}>
            <Link
              className="text-blue-700 underline"
              href={`/sales/returns/new?invoiceId=${i.id}`}
            >
              {i.invoiceNumber} · {i.customer?.name ?? "Walk-in buyer"}
            </Link>
          </p>
        ))}
      </div>
    );
  }
  const invoice = await db.saleInvoice.findFirst({
    where: { id: invoiceId, companyId, status: "POSTED", directKey: null },
    include: {
      customer: { select: { id: true, name: true } },
      items: { include: { product: true, batch: true } },
      returns: { where: { status: "POSTED" }, include: { items: true } },
    },
  });
  if (!invoice) notFound();
  const byProduct = new Map<string, ReturnProductOption>();
  const seen = new Set<string>();
  for (const item of invoice.items) {
    if (seen.has(item.batchId)) continue;
    seen.add(item.batchId);
    const originals = invoice.items.filter((i) => i.batchId === item.batchId);
    const sold = originals.reduce((sum, i) => sum + i.quantity, 0),
      returned = invoice.returns
        .flatMap((r) => r.items)
        .filter((i) => i.batchId === item.batchId)
        .reduce((sum, i) => sum + i.quantity, 0);
    if (sold - returned <= 0.0000001) continue;
    const product = byProduct.get(item.productId) ?? {
      id: item.productId,
      name: item.product.name,
      unit: item.product.unit,
      batches: [],
    };
    product.batches.push({
      id: item.batchId,
      batchNumber: item.batch.batchNumber,
      expiryDate: item.batch.expiryDate?.toISOString() ?? null,
      currentQty: item.batch.quantity,
      soldQty: sold - returned,
      salePrice: item.salePrice.toString(),
    });
    byProduct.set(item.productId, product);
  }
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-bold">
        Return against {invoice.invoiceNumber}
      </h1>
      <p>
        Only cloth on this bill can be returned, up to the unreturned quantity.
        The server uses the original selling price, discounts and tax.
      </p>
      <SaleReturnForm
        products={[...byProduct.values()]}
        customers={invoice.customer ? [invoice.customer] : []}
        defaultInvoiceId={invoice.id}
        defaultCustomerId={invoice.customerId ?? undefined}
      />
    </div>
  );
}
