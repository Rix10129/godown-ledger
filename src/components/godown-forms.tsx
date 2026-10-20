"use client";
import { useActionState, useEffect } from "react";
import {
  recordMill,
  receiveCloth,
  priceReceipt,
} from "@/app/(dashboard)/mills/actions";
const input = "rounded border p-2";
export function MillForm() {
  const [state, action, pending] = useActionState(recordMill, null);
  useEffect(() => {
    if (state?.ok) window.dispatchEvent(new Event("godown-entry-saved"));
  }, [state]);
  return (
    <form action={action} className="flex flex-wrap gap-3">
      <input
        aria-label="Mill name"
        name="name"
        placeholder="Mill name"
        className={input}
        required
      />
      <input
        aria-label="Mill city"
        name="city"
        placeholder="City"
        className={input}
      />
      <button
        className="rounded bg-slate-900 px-4 py-2 text-white"
        disabled={pending}
      >
        Add mill
      </button>
      {state?.error && <p role="alert">{state.error}</p>}
      {state?.ok && <p role="status">Mill added.</p>}
    </form>
  );
}
export function ClothReceiptForm({
  mills,
  products,
}: {
  mills: { id: string; name: string }[];
  products: { id: string; name: string; unit: string }[];
}) {
  const [state, action, pending] = useActionState(receiveCloth, null);
  useEffect(() => {
    if (state?.ok) window.dispatchEvent(new Event("godown-entry-saved"));
  }, [state]);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <select aria-label="Mill" name="supplierId" className={input} required>
        <option value="">Choose mill</option>
        {mills.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <select aria-label="Product" name="productId" className={input} required>
        <option value="">Choose product</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.unit}
          </option>
        ))}
      </select>
      <input
        aria-label="Lot number"
        name="lot"
        placeholder="Lot / thaan number"
        className={input}
        required
      />
      <input
        aria-label="Quantity received"
        name="quantity"
        type="number"
        min="0.001"
        step="0.001"
        placeholder="Quantity"
        className={input}
        required
      />
      <input
        aria-label="Cloth details"
        name="detail"
        placeholder="Shade, count/quality, width/GSM, godown/rack"
        className={input}
        maxLength={500}
      />
      <button className="rounded bg-blue-600 p-2 text-white" disabled={pending}>
        Record cloth for pricing
      </button>
      <p className="text-sm text-slate-500 md:col-span-2">
        The bookkeeper adds the rate before this lot becomes available to sell.
      </p>
      {state?.error && <p role="alert">{state.error}</p>}
      {state?.ok && <p role="status">Receipt saved for pricing.</p>}
    </form>
  );
}
export function PriceReceiptForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(priceReceipt, null);
  useEffect(() => {
    if (state?.ok) window.dispatchEvent(new Event("godown-entry-saved"));
  }, [state]);
  return (
    <form action={action} className="mt-3 flex flex-wrap gap-3">
      <input name="id" type="hidden" value={id} />
      <input
        aria-label="Purchase rate"
        name="rate"
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Purchase rate"
        className={input}
        required
      />
      <input
        aria-label="Selling rate"
        name="saleRate"
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Selling rate"
        className={input}
        required
      />
      <button className="rounded bg-blue-600 p-2 text-white" disabled={pending}>
        Price and post receipt
      </button>
      {state?.error && <p role="alert">{state.error}</p>}
      {state?.ok && <p role="status">Posted.</p>}
    </form>
  );
}
