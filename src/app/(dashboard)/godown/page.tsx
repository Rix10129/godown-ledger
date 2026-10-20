import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OfficeHeading, EmptyState } from "@/components/office-design";
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
  const bookkeeper = session.user.role === "ACCOUNTANT";
  const canManageProducts = ["OWNER", "ACCOUNTANT"].includes(session.user.role);
  return (
    <div className="space-y-6">
      <OfficeHeading
        kicker="02 / Godown & mills"
        title="Godown stock"
        action={
          bookkeeper ? (
            <Link href="/receipts" className="office-button">
              Price received cloth
            </Link>
          ) : (
            <a href="#receive-cloth" className="office-button shrink-0">
              ＋ Receive cloth
            </a>
          )
        }
      >
        Receive cloth, follow each lot, and see what is ready to sell.
      </OfficeHeading>
      <div className="office-metrics">
        <div className="office-metric">
          <p>Available lots</p>
          <strong>{lots.length}</strong>
          <small>Priced and ready to sell</small>
        </div>
        <div className="office-metric">
          <p>Waiting for a rate</p>
          <strong>{waiting.length}</strong>
          <small>For the bookkeeper</small>
        </div>
        <div className="office-metric">
          <p>Mills on file</p>
          <strong>{mills.length}</strong>
          <small>Your cloth suppliers</small>
        </div>
      </div>
      {!bookkeeper && (
        <section id="receive-cloth" className="office-panel scroll-mt-6">
          <div className="office-panel-head">
            <h2>Cloth received</h2>
            <span className="office-status office-status-waiting">
              Receipt entry
            </span>
          </div>
          {(!mills.length || !products.length) && (
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-100 px-5 py-4">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Start by adding{" "}
                  {!mills.length && !products.length
                    ? "a mill and a cloth product"
                    : !mills.length
                      ? "a mill"
                      : "a cloth product"}
                  .
                </p>
                <p className="office-note mt-1">
                  {canManageProducts
                    ? "Then record the first delivery below."
                    : "The owner or bookkeeper adds cloth products under Inventory first."}
                </p>
              </div>
              {!mills.length && (
                <Link href="/mills" className="office-button-quiet">
                  Add a mill
                </Link>
              )}
              {!products.length && canManageProducts && (
                <Link href="/inventory/new" className="office-button-quiet">
                  Add cloth product
                </Link>
              )}
            </div>
          )}
          <div className="office-panel-body">
            <ClothReceiptForm mills={mills} products={products} />
          </div>
        </section>
      )}
      <section className="office-panel">
        <div className="office-panel-head">
          <h2>Available stock</h2>
          <span className="office-status">
            {lots.length} open {lots.length === 1 ? "lot" : "lots"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3">Cloth</th>
                <th className="px-4 py-3">Lot / thaan</th>
                <th className="px-4 py-3">Mill</th>
                <th className="px-5 py-3 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-slate-200 last:border-0"
                >
                  <td className="px-5 py-4 font-medium">{l.product.name}</td>
                  <td className="px-4 py-4 font-mono text-xs">
                    {l.batchNumber}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {l.product.supplier?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                    {l.quantity.toLocaleString("en-PK", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    <span className="text-xs text-slate-500">
                      {l.product.unit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!lots.length && (
          <EmptyState title="Your first lot starts here">
            Once a delivery is recorded and priced, its remaining quantity will
            appear in this list.
          </EmptyState>
        )}
      </section>
      <section className="office-panel">
        <div className="office-panel-head">
          <h2>Waiting for a rate</h2>
          <span className="office-status office-status-waiting">
            {waiting.length} {waiting.length === 1 ? "receipt" : "receipts"}
          </span>
        </div>
        {waiting.length ? (
          <ul className="divide-y divide-slate-200">
            {waiting.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-mono text-xs text-blue-600">
                    {r.poNumber}
                  </p>
                  <p className="mt-1 text-sm">
                    {r.items
                      .map(
                        (i) =>
                          `${i.product.name} · ${i.quantity} ${i.product.unit}`,
                      )
                      .join(", ")}
                  </p>
                </div>
                {canManageProducts ? (
                  <Link href="/receipts" className="office-button-quiet">
                    Review rates
                  </Link>
                ) : (
                  <span className="office-note">
                    The bookkeeper prices this.
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="office-note px-5 py-5">
            No unpriced receipts. New deliveries saved for pricing will appear
            here.
          </p>
        )}
      </section>
      <p className="office-note">
        Quantities keep their product’s unit: kg, metres or thaan.
      </p>
    </div>
  );
}
