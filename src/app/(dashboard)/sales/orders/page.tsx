import { db } from "@/lib/db";
import { authorize, hasPermission } from "@/lib/authorization";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WorkflowForm, OrderLines } from "@/components/workflow-form";
import { createOrder, closeOrder, amendOrderItem } from "../../stock/actions";
export const metadata = { title: "Customer orders" };
export default async function OrdersPage() {
  const auth = await authorize("SALE_CREATE");
  if (!auth.ok) redirect("/desk");
  const companyId = auth.actor.companyId;
  const [customers, products, orders] = await Promise.all([
    db.customer.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.product.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    db.customerOrder.findMany({
      where: { companyId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            invoiceItems: {
              where: { invoice: { status: "POSTED" } },
              include: {
                invoice: { select: { id: true, invoiceNumber: true } },
              },
            },
          },
        },
      },
      orderBy: { orderDate: "desc" },
      take: 100,
    }),
  ]);
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Customer orders</h1>
      <p>
        Track each quality / colour separately. Orders do not post stock or
        money. Add a product to a sales bill and select its customer order to
        record a delivery.
      </p>
      <WorkflowForm action={createOrder} label="Create customer order">
        <h2 className="font-semibold">New order</h2>
        <label className="block">
          Customer
          <select required name="customerId">
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <OrderLines products={products} />
        <label className="block">
          Notes
          <input name="notes" />
        </label>
      </WorkflowForm>
      {orders.map((o) => (
        <section
          className="rounded-xl border bg-white p-5 space-y-3"
          key={o.id}
        >
          <h2 className="font-semibold">
            {o.orderNumber} · {o.customer.name} · {o.status}
          </h2>
          {o.notes && <p>{o.notes}</p>}
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-left [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2">
              <thead>
                <tr>
                  <th>Quality / colour</th>
                  <th>Ordered</th>
                  <th>Delivered</th>
                  <th>Remaining</th>
                  <th>Bills</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => {
                  const delivered = i.invoiceItems.reduce(
                    (n, l) => n + Number(l.quantity),
                    0,
                  );
                  return (
                    <tr key={i.id}>
                      <td>
                        {i.product.name} ({i.product.unit})
                      </td>
                      <td>{Number(i.quantity)}</td>
                      <td>{delivered}</td>
                      <td>
                        {Number((Number(i.quantity) - delivered).toFixed(3))}
                      </td>
                      <td>
                        {[
                          ...new Map(
                            i.invoiceItems.map((l) => [
                              l.invoice.id,
                              l.invoice,
                            ]),
                          ).values(),
                        ].map((inv) => (
                          <Link
                            className="mr-2 underline"
                            href={`/sales/${inv.id}`}
                            key={inv.id}
                          >
                            {inv.invoiceNumber}
                          </Link>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {o.status === "OPEN" &&
            hasPermission(auth.actor.role, "SALE_EDIT") && (
              <details>
                <summary className="cursor-pointer underline">
                  Correct ordered quantities
                </summary>
                {o.items.map((i) => (
                  <WorkflowForm
                    key={i.id}
                    action={amendOrderItem}
                    label="Save corrected quantity"
                  >
                    <p>
                      {i.product.name} ({i.product.unit})
                    </p>
                    <input type="hidden" name="id" value={i.id} />
                    <label>
                      Ordered quantity
                      <input
                        name="quantity"
                        type="number"
                        min="0.001"
                        step="0.001"
                        defaultValue={Number(i.quantity)}
                        required
                      />
                    </label>
                    <label>
                      Correction reason
                      <input name="reason" required minLength={5} />
                    </label>
                  </WorkflowForm>
                ))}
              </details>
            )}
          {o.status === "OPEN" && (
            <>
              <Link className="underline" href="/sales/new">
                Create a delivery bill
              </Link>
              {hasPermission(auth.actor.role, "SALE_EDIT") && (
                <WorkflowForm action={closeOrder} label="Close remaining order">
                  <input type="hidden" name="id" value={o.id} />
                  <p>
                    Closes the undelivered balance and keeps delivery history.
                  </p>
                </WorkflowForm>
              )}
            </>
          )}
        </section>
      ))}
    </main>
  );
}
