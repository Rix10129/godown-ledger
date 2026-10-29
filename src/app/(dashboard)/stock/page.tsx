import { db } from "@/lib/db";
import { authorize } from "@/lib/authorization";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { WorkflowForm } from "@/components/workflow-form";
import {
  partyMovement,
  recordThaanLengths,
  reverseThaanLengths,
} from "./actions";
export const metadata = { title: "Stock" };
export default async function StockPage() {
  const auth = await authorize("ACCOUNTING_MANAGE");
  if (!auth.ok) redirect("/desk");
  const companyId = auth.actor.companyId;
  const [batches, jobs, entries, customers, products] = await Promise.all([
    db.productBatch.findMany({
      where: { companyId, quantity: { gt: 0 } },
      include: { product: { include: { supplier: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.productionJob.findMany({
      where: { companyId },
      include: { unit: true, yarnBatch: { include: { product: true } } },
    }),
    db.partyStockEntry.findMany({
      where: { companyId },
      include: { customer: true, product: true },
      orderBy: { createdAt: "asc" },
    }),
    db.customer.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
    db.product.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, unit: true },
    }),
  ]);
  const orders = await db.customerOrder.findMany({
    where: { companyId, status: "OPEN" },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          invoiceItems: {
            where: { invoice: { status: "POSTED" } },
            select: { quantity: true },
          },
        },
      },
    },
  });
  const measured = await db.stockMovement.findMany({
    where: { companyId, sourceType: "THAAN_MEASUREMENT", quantity: { lt: 0 } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const reversed = await db.stockMovement.findMany({
    where: { companyId, sourceType: "THAAN_MEASUREMENT_REVERSAL" },
    select: { sourceId: true },
  });
  const balances = new Map<
    string,
    { customer: string; product: string; unit: string; quantity: number }
  >();
  for (const e of entries) {
    const key = e.customerId + ":" + e.productId;
    const row = balances.get(key) || {
      customer: e.customer.name,
      product: e.product.name,
      unit: e.product.unit,
      quantity: 0,
    };
    row.quantity += Number(e.quantity);
    balances.set(key, row);
  }
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Stock — mill, production & party
      </h1>
      <Link className="underline" href="/stock/production">
        Production units, cloth receipts & weaving wages
      </Link>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Party orders — remaining to deliver</h2>
        <p>
          Our customers' outstanding orders. These quantities have not yet left
          the godown.
        </p>
        <Link className="underline" href="/sales/orders">
          Open customer orders
        </Link>
        {orders.map((o) => (
          <div key={o.id}>
            <h3>
              {o.customer.name} · {o.orderNumber}
            </h3>
            {o.items.map((i) => (
              <p key={i.id}>
                {i.product.name}:{" "}
                {Number(
                  (
                    Number(i.quantity) -
                    i.invoiceItems.reduce((n, l) => n + Number(l.quantity), 0)
                  ).toFixed(3),
                )}{" "}
                {i.product.unit} remaining
              </p>
            ))}
          </div>
        ))}
      </section>
      <WorkflowForm action={recordThaanLengths} label="Record thaan lengths">
        <h2 className="font-semibold">
          Measure thaans from existing cloth stock
        </h2>
        <p>
          Transfers metres from an existing lot into separate, measured thaans.
          Total stock and its value stay the same.
        </p>
        <label>
          Original cloth lot
          <select name="batchId" required>
            <option value="">Select cloth lot</option>
            {batches
              .filter((b) => b.product.unit === "METER")
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.product.name} · {b.batchNumber} · {Number(b.quantity)}{" "}
                  metres
                </option>
              ))}
          </select>
        </label>
        <label>
          Each thaan's length in metres
          <textarea name="lengths" required placeholder="20, 100, 200" />
        </label>
      </WorkflowForm>
      {measured
        .filter((m) => !reversed.some((r) => r.sourceId === m.sourceId))
        .map((m) => (
          <details className="rounded border bg-white p-3" key={m.id}>
            <summary>
              Correct thaan measurements — {m.reference} · {-m.quantity} metres
            </summary>
            <WorkflowForm
              action={reverseThaanLengths}
              label="Reverse measurements"
            >
              <input type="hidden" name="sourceId" value={m.sourceId ?? ""} />
              <label>
                Correction reason
                <input name="reason" required minLength={5} />
              </label>
              <p>Thaans must have no later sales or stock movements.</p>
            </WorkflowForm>
          </details>
        ))}
      <section className="rounded-xl border bg-white p-5 overflow-auto">
        <h2 className="font-semibold">
          Our stock in the godown, by mill and lot
        </h2>
        <p>
          Gazana is measured in metres. Each marked thaan has its own recorded
          length.
        </p>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Mill</th>
              <th>Quality / colour</th>
              <th>Lot / thaan</th>
              <th>Available</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>{b.product.supplier?.name || "—"}</td>
                <td>
                  <Link
                    className="underline"
                    href={`/inventory/${b.productId}`}
                  >
                    {b.product.name}
                  </Link>
                </td>
                <td>
                  {b.batchNumber}
                  {b.isThaan ? " · 1 thaan" : ""}
                </td>
                <td>{Number(b.quantity)}</td>
                <td>
                  {b.product.unit === "METER"
                    ? "Gazana (metres)"
                    : b.product.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          {batches.filter((b) => b.isThaan).length} thaans currently in stock;
          lengths are not assumed equal.
        </p>
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Our yarn held at production units</h2>
        {jobs.map((j) => {
          const remaining =
            Number(j.issuedQuantity) -
            Number(j.consumedQuantity) -
            Number(j.returnedQuantity);
          return remaining > 0 ? (
            <p key={j.id}>
              {j.jobNumber} · {j.unit.name} · {j.yarnBatch.product.name}:{" "}
              {Number(remaining.toFixed(3))} {j.yarnBatch.product.unit}
            </p>
          ) : null;
        })}
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Party-owned stock held by us</h2>
        <p>
          These goods belong to the customer. They are kept separate from our
          stock and valuation.
        </p>
        {[...balances.entries()].map(([key, b]) => (
          <p key={key}>
            {b.customer} · {b.product}: {Number(b.quantity.toFixed(3))} {b.unit}
          </p>
        ))}
      </section>
      <WorkflowForm action={partyMovement} label="Record party-stock movement">
        <h2 className="font-semibold">Receive / deliver party-owned stock</h2>
        <label className="block">
          Customer
          <select name="customerId" required>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Quality / colour
          <select name="productId" required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Movement
          <select name="direction">
            <option value="IN">Receive from customer</option>
            <option value="OUT">Deliver back to customer</option>
          </select>
        </label>
        <label className="block">
          Quantity
          <input
            type="number"
            name="quantity"
            required
            min="0.001"
            step="0.001"
          />
        </label>
        <label className="block">
          Unique receipt / delivery reference
          <input name="reference" required />
        </label>
        <label className="block">
          Notes / correction reason
          <input name="notes" />
        </label>
      </WorkflowForm>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Party-stock history</h2>
        {entries
          .slice(-100)
          .reverse()
          .map((e) => (
            <p key={e.id}>
              {formatDate(e.createdAt)} · {e.reference} · {e.customer.name} ·{" "}
              {e.product.name} · {Number(e.quantity)} {e.product.unit} ·{" "}
              {e.notes}
            </p>
          ))}
      </section>
    </main>
  );
}
