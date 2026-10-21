"use client";
import { useActionState, useState } from "react";
import {
  createDirect,
  cancelDirect,
} from "@/app/(dashboard)/sales/direct/actions";
export function DirectDealForm({
  mills,
  buyers,
  requestKey,
}: {
  mills: { id: string; name: string }[];
  buyers: { id: string; name: string }[];
  requestKey: string;
}) {
  const [state, action, pending] = useActionState(createDirect, null);
  const [unit, setUnit] = useState("BAG");
  return (
    <form
      action={action}
      className="grid gap-4 rounded border bg-white p-5 md:grid-cols-2"
    >
      <input name="key" type="hidden" value={requestKey} />
      <label>
        Mill
        <select
          aria-label="Mill"
          className="mt-1 w-full rounded border p-2"
          name="supplierId"
          required
        >
          <option value="">Choose mill</option>
          {mills.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Buyer
        <select
          aria-label="Buyer"
          className="mt-1 w-full rounded border p-2"
          name="customerId"
          required
        >
          <option value="">Choose buyer</option>
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="md:col-span-2">
        Cloth / lot description
        <input
          name="description"
          className="mt-1 w-full rounded border p-2"
          required
          maxLength={300}
        />
      </label>
      <label>
        Quantity ({unit})
        <input
          className="mt-1 w-full rounded border p-2"
          name="quantity"
          type="number"
          min="0.001"
          step="0.001"
          required
        />
      </label>
      <label>
        Unit
        <select
          name="unit"
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className="mt-1 w-full rounded border p-2"
        >
          <option value="BAG">Bag</option>
          <option>KG</option>
          <option>METER</option>
          <option>THAAN</option>
        </select>
      </label>
      <label>
        Mill cost per {unit.toLowerCase()}
        <input
          className="mt-1 w-full rounded border p-2"
          name="costRate"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </label>
      <label>
        Selling price per {unit.toLowerCase()}
        <input
          className="mt-1 w-full rounded border p-2"
          name="saleRate"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </label>
      <label>
        Buyer pays
        <select name="buyerMode" className="mt-1 w-full rounded border p-2">
          <option value="CREDIT">On account</option>
          <option value="CASH">Cash now</option>
        </select>
      </label>
      <label>
        Mill receives
        <select name="millMode" className="mt-1 w-full rounded border p-2">
          <option value="CREDIT">On account</option>
          <option value="CASH">Cash now</option>
        </select>
      </label>
      <p className="text-sm text-slate-500 md:col-span-2">
        No godown stock moves. This deal posts sales, cost, buyer and mill
        accounts. Rates here exclude tax; this is not an FBR e-invoice.
      </p>
      {state?.error && (
        <p role="alert" className="text-red-600 md:col-span-2">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded bg-blue-600 p-3 text-white disabled:opacity-50"
      >
        {pending ? "Posting…" : "Post direct deal"}
      </button>
    </form>
  );
}
export function CancelDirectForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(cancelDirect, null);
  return (
    <form action={action} className="mt-2 flex flex-wrap gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="reason"
        aria-label="Cancellation reason"
        placeholder="Cancellation reason"
        required
        minLength={3}
        className="rounded border p-2"
      />
      <button disabled={pending} className="text-sm text-red-700">
        Reverse direct deal
      </button>
      {state?.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
