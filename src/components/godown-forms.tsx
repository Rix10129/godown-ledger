"use client";
import { useActionState, useEffect, useState } from "react";
import {
  recordMill,
  receiveCloth,
  priceReceipt,
} from "@/app/(dashboard)/mills/actions";
function Feedback({
  state,
}: {
  state: { error?: string; ok?: boolean } | null | undefined;
}) {
  return (
    <>
      {state?.error && (
        <p className="office-alert col-span-full" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="office-success col-span-full" role="status">
          Saved to the shared office book.
        </p>
      )}
    </>
  );
}
export function MillForm() {
  const [state, action, pending] = useActionState(recordMill, null);
  useEffect(() => {
    if (state?.ok) window.dispatchEvent(new Event("godown-entry-saved"));
  }, [state]);
  return (
    <form
      action={action}
      className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
    >
      <label className="office-field">
        Mill name
        <input
          aria-label="Mill name"
          name="name"
          placeholder="Mill or supplier name"
          className="office-control"
          required
        />
      </label>
      <label className="office-field">
        City <small>· optional</small>
        <input
          aria-label="Mill city"
          name="city"
          placeholder="For example, Faisalabad"
          className="office-control"
        />
      </label>
      <button className="office-button" disabled={pending}>
        {pending ? "Adding…" : "Add mill"}
      </button>
      <Feedback state={state} />
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
  const [productId, setProductId] = useState("");
  const unit = products.find((p) => p.id === productId)?.unit;
  const ready = mills.length > 0 && products.length > 0;
  useEffect(() => {
    if (state?.ok) window.dispatchEvent(new Event("godown-entry-saved"));
  }, [state]);
  return (
    <form action={action} className="grid gap-x-5 gap-y-4 md:grid-cols-2">
      <label className="office-field">
        Mill
        <select
          aria-label="Mill"
          name="supplierId"
          className="office-control"
          required
          disabled={!mills.length}
        >
          <option value="">
            {mills.length ? "Choose mill" : "Add a mill first"}
          </option>
          {mills.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="office-field">
        Cloth / product
        <select
          aria-label="Product"
          name="productId"
          className="office-control"
          required
          disabled={!products.length}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">
            {products.length ? "Choose product" : "Add a cloth product first"}
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.unit}
            </option>
          ))}
        </select>
      </label>
      <label className="office-field">
        Lot / thaan number
        <input
          aria-label="Lot number"
          name="lot"
          placeholder="As written on the delivery slip"
          className="office-control"
          required
        />
      </label>
      <label className="office-field">
        Quantity <small>· {unit ?? "unit follows the product"}</small>
        <input
          aria-label="Quantity received"
          name="quantity"
          type="number"
          min="0.001"
          step="0.001"
          placeholder="0.000"
          className="office-control"
          required
        />
      </label>
      <label className="office-field md:col-span-2">
        Shade, quality &amp; storage notes <small>· optional</small>
        <input
          aria-label="Cloth details"
          name="detail"
          placeholder="Shade, count/quality, width/GSM, godown/rack"
          className="office-control"
          maxLength={500}
        />
      </label>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 md:col-span-2">
        <p className="office-note max-w-md">
          The bookkeeper adds the rate before this lot becomes available to
          sell.
        </p>
        <button
          aria-label="Record cloth for pricing"
          className="office-button"
          disabled={pending || !ready}
        >
          {pending ? "Saving…" : "Save for pricing"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
export function PriceReceiptForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(priceReceipt, null);
  useEffect(() => {
    if (state?.ok) window.dispatchEvent(new Event("godown-entry-saved"));
  }, [state]);
  return (
    <form
      action={action}
      className="mt-5 grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
    >
      <input name="id" type="hidden" value={id} />
      <label className="office-field">
        Purchase rate <small>· Rs / unit</small>
        <input
          aria-label="Purchase rate"
          name="rate"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          className="office-control"
          required
        />
      </label>
      <label className="office-field">
        Selling rate <small>· Rs / unit</small>
        <input
          aria-label="Selling rate"
          name="saleRate"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          className="office-control"
          required
        />
      </label>
      <button className="office-button" disabled={pending}>
        {pending ? "Posting…" : "Price and post receipt"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
