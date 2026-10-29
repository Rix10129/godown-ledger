import { db } from "@/lib/db";
import { authorize } from "@/lib/authorization";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { WorkflowForm } from "@/components/workflow-form";
import {
  createUnit,
  updateUnit,
  issueYarn,
  receiveCloth,
  returnYarn,
  payUnit,
  reverseEntry,
} from "../actions";
import { formatCurrency } from "@/lib/utils";
export const metadata = { title: "Production & weaving wages" };
export default async function ProductionPage() {
  const auth = await authorize("ACCOUNTING_MANAGE");
  if (!auth.ok) redirect("/desk");
  const companyId = auth.actor.companyId;
  const [units, batches, cloth, jobs, payments] = await Promise.all([
    db.productionUnit.findMany({
      where: { companyId },
      include: {
        payments: { where: { status: "POSTED" } },
        jobs: { include: { receipts: { where: { status: "POSTED" } } } },
      },
      orderBy: { name: "asc" },
    }),
    db.productBatch.findMany({
      where: { companyId, quantity: { gt: 0 } },
      include: { product: true },
    }),
    db.product.findMany({
      where: { companyId, isActive: true, unit: "METER" },
      select: { id: true, name: true },
    }),
    db.productionJob.findMany({
      where: { companyId },
      include: {
        unit: true,
        yarnBatch: { include: { product: true } },
        clothProduct: true,
        receipts: { include: { batches: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.productionPayment.findMany({
      where: { companyId },
      include: { unit: true },
      orderBy: { paymentDate: "desc" },
      take: 100,
    }),
  ]);
  const unitOptions = units.map((u) => (
    <option key={u.id} value={u.id}>
      {u.name} — {formatCurrency(Number(u.wageRate))}/metre
    </option>
  ));
  const jobOptions = jobs.map((j) => (
    <option key={j.id} value={j.id}>
      {j.jobNumber} · {j.unit.name} · {j.clothProduct.name}
    </option>
  ));
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Production & weaving wages</h1>
      <Link className="underline" href="/stock">
        View all stock
      </Link>
      <p>
        Issue our yarn to a weaving unit. Record each cloth delivery in metres
        and the actual yarn used. Wages = metres received × the agreed rate.
        Record payments separately.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkflowForm action={createUnit} label="Add production unit">
          <h2 className="font-semibold">Production unit</h2>
          <label className="block">
            Unit name
            <input name="name" minLength={2} required />
          </label>
          <label className="block">
            Default wages per metre (Rs)
            <input
              name="wageRate"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
        </WorkflowForm>
        <WorkflowForm action={issueYarn} label="Issue yarn">
          <h2 className="font-semibold">Start production job</h2>
          <label className="block">
            Production unit
            <select name="unitId" required>
              {unitOptions}
            </select>
          </label>
          <label className="block">
            Yarn lot
            <select name="yarnBatchId" required>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.product.name} · {b.batchNumber} · {Number(b.quantity)}{" "}
                  {b.product.unit} available
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Yarn quantity
            <input
              name="quantity"
              type="number"
              min="0.001"
              step="0.001"
              required
            />
          </label>
          <label className="block">
            Cloth product (metres)
            <select name="clothProductId" required>
              {cloth.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Agreed wages per metre (optional override)
            <input
              name="wageRate"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Use unit's default rate"
            />
          </label>
        </WorkflowForm>
        <WorkflowForm
          action={receiveCloth}
          label="Receive cloth & record wages"
        >
          <h2 className="font-semibold">Receive cloth</h2>
          <label className="block">
            Job
            <select name="jobId" required>
              {jobOptions}
            </select>
          </label>
          <label className="block">
            Gazana received (metres)
            <input
              name="meters"
              type="number"
              min="0.001"
              step="0.001"
              required
            />
          </label>
          <label className="block">
            Actual yarn used (job's yarn unit)
            <input
              name="yarnConsumed"
              type="number"
              min="0.001"
              step="0.001"
              required
            />
          </label>
          <label className="block">
            Each thaan's length in metres (optional)
            <textarea name="lengths" placeholder="20, 100, 200" />
          </label>
          <p className="text-sm">
            Enter each thaan separately, separated by commas or new lines. Their
            lengths must total the metres received. Leave blank only for bulk
            cloth without individual thaan measurements.
          </p>
          <label className="block">
            Sale rate per metre (Rs)
            <input
              name="salePrice"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
        </WorkflowForm>
        <WorkflowForm action={payUnit} label="Record wage payment">
          <h2 className="font-semibold">Pay production unit</h2>
          <label className="block">
            Production unit
            <select name="unitId" required>
              {unitOptions}
            </select>
          </label>
          <label className="block">
            Amount (Rs)
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label className="block">
            Paid from
            <select name="paymentMode">
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
            </select>
          </label>
          <label className="block">
            Bank / payment reference
            <input name="reference" />
          </label>
        </WorkflowForm>
        <WorkflowForm action={returnYarn} label="Return unused yarn">
          <h2 className="font-semibold">Return yarn from production unit</h2>
          <label className="block">
            Job
            <select name="jobId" required>
              {jobOptions}
            </select>
          </label>
          <label className="block">
            Quantity returned (job's yarn unit)
            <input
              name="quantity"
              type="number"
              min="0.001"
              step="0.001"
              required
            />
          </label>
        </WorkflowForm>
      </div>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Production-unit accounts</h2>
        {units.map((u) => {
          const due = u.jobs
              .flatMap((j) => j.receipts)
              .reduce((n, r) => n + Number(r.wages), 0),
            paid = u.payments.reduce((n, p) => n + Number(p.amount), 0);
          return (
            <p key={u.id}>
              {u.name} · Wages earned: {formatCurrency(due)} · Paid:{" "}
              {formatCurrency(paid)} · Unpaid: {formatCurrency(due - paid)}
            </p>
          );
        })}
      </section>
      <details className="rounded-xl border bg-white p-5">
        <summary className="cursor-pointer underline">
          Edit production units / default wages
        </summary>
        {units.map((u) => (
          <WorkflowForm key={u.id} action={updateUnit} label="Update unit">
            <input type="hidden" name="id" value={u.id} />
            <label>
              Unit name
              <input name="name" defaultValue={u.name} required minLength={2} />
            </label>
            <label>
              Default wages per metre
              <input
                name="wageRate"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={Number(u.wageRate)}
                required
              />
            </label>
            <p>
              Existing jobs retain their agreed wage rate. This default applies
              to new jobs.
            </p>
          </WorkflowForm>
        ))}
      </details>
      {jobs.map((j) => (
        <section
          className="rounded-xl border bg-white p-5 space-y-3"
          key={j.id}
        >
          <h2 className="font-semibold">
            {j.jobNumber} · {j.unit.name} · {j.clothProduct.name}
          </h2>
          <p>
            Agreed wages: {formatCurrency(Number(j.wageRate))}/metre. Yarn
            issued: {Number(j.issuedQuantity)}; used:{" "}
            {Number(j.consumedQuantity)}; returned: {Number(j.returnedQuantity)}{" "}
            {j.yarnBatch.product.unit}.
          </p>
          {j.receipts.map((r) => (
            <div className="border-t pt-3" key={r.id}>
              <p>
                {r.receiptNumber} · {r.status} · {Number(r.meters)} metres ·
                Wages: {formatCurrency(Number(r.wages))} · Yarn cost:{" "}
                {formatCurrency(Number(r.yarnCost))}
              </p>
              <p>
                {r.batches.filter((b) => b.isThaan).length} individually
                measured thaans:{" "}
                {r.batches
                  .filter((b) => b.isThaan)
                  .map((b) => Number(b.initialQuantity))
                  .join(", ")}
              </p>
              {r.status === "POSTED" && (
                <WorkflowForm
                  action={reverseEntry}
                  label="Reverse incorrect receipt"
                >
                  <input type="hidden" name="kind" value="receipt" />
                  <input type="hidden" name="id" value={r.id} />
                  <label className="block">
                    Correction reason
                    <input name="reason" required minLength={5} />
                  </label>
                  <p className="text-sm">
                    Only unused cloth can be reversed. Correct later sales or
                    movements and any wage payment first.
                  </p>
                </WorkflowForm>
              )}
            </div>
          ))}
        </section>
      ))}
      <section className="space-y-3">
        <h2 className="font-semibold">Wage-payment history</h2>
        {payments.map((p) => (
          <div key={p.id} className="rounded border bg-white p-4">
            <p>
              {formatDate(p.paymentDate)} · {p.unit.name} ·{" "}
              {formatCurrency(Number(p.amount))} · {p.paymentMode} ·{" "}
              {p.reference} · {p.status}
            </p>
            {p.status === "POSTED" && (
              <WorkflowForm
                action={reverseEntry}
                label="Reverse incorrect payment"
              >
                <input type="hidden" name="kind" value="payment" />
                <input type="hidden" name="id" value={p.id} />
                <label>
                  Correction reason
                  <input name="reason" required minLength={5} />
                </label>
              </WorkflowForm>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
