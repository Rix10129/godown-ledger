"use client";
import Decimal from "decimal.js";
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
  kind = "cloth",
  canCreateProducts = false,
  canPrice = false,
  initialRequestKey,
}: {
  mills: { id: string; name: string }[];
  products: { id: string; name: string; unit: string }[];
  kind?: "cloth" | "bags";
  canCreateProducts?: boolean;
  canPrice?: boolean;
  initialRequestKey: string;
}) {
  const [productId, setProductId] = useState("");
  const [createNew, setCreateNew] = useState(
    !products.length && canCreateProducts,
  );
  const [newUnit, setNewUnit] = useState(kind === "bags" ? "BAG" : "METER");
  const [quantity, setQuantity] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [requestKey, setRequestKey] = useState(initialRequestKey);
  const [state, action, pending] = useActionState(
    async (
      previous: { error?: string; ok?: boolean } | null,
      form: FormData,
    ) => {
      const result = await receiveCloth(previous, form);
      if (result.ok) {
        setRequestKey(crypto.randomUUID());
        setProductId("");
        setQuantity("");
        setPurchaseRate("");
        window.dispatchEvent(new Event("godown-entry-saved"));
      }
      return result;
    },
    null,
  );
  const unit = createNew
    ? newUnit
    : products.find((p) => p.id === productId)?.unit;
  const ready =
    mills.length > 0 && (createNew ? canCreateProducts : products.length > 0);
  let amount = "—";
  if (
    quantity &&
    purchaseRate &&
    Number(quantity) > 0 &&
    Number(purchaseRate) > 0
  )
    amount = "Rs " + new Decimal(quantity).times(purchaseRate).toFixed(2);
  return (
    <form action={action} className="grid gap-x-5 gap-y-4 md:grid-cols-2">
      <input type="hidden" name="receiptKind" value={kind} />
      <input type="hidden" name="requestKey" value={requestKey} />
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
      <div className="office-field">
        {createNew ? (
          <label className="office-field">
            {kind === "bags"
              ? "New bag product name"
              : "New cloth product name"}
            <input
              aria-label="New product name"
              name="productName"
              placeholder={
                kind === "bags"
                  ? "For example, 20/s Cotton"
                  : "Quality / colour"
              }
              minLength={2}
              maxLength={160}
              required
              className="office-control"
            />
          </label>
        ) : (
          <label className="office-field">
            {kind === "bags" ? "Bag product" : "Cloth / product"}
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
                {products.length
                  ? "Choose product"
                  : "Ask the owner to add a product"}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.unit}
                </option>
              ))}
            </select>
          </label>
        )}
        {canCreateProducts && (
          <button
            type="button"
            className="text-left text-sm underline"
            onClick={() => setCreateNew(!createNew)}
          >
            {createNew
              ? "Choose an existing product"
              : "＋ Add a new product here"}
          </button>
        )}
        {!products.length && !canCreateProducts && (
          <p className="office-note">
            The owner can add a product from this receipt form.
          </p>
        )}
      </div>
      {createNew && (
        <label className="office-field">
          Stock unit
          {kind === "bags" ? (
            <>
              <input type="hidden" name="productUnit" value="BAG" />
              <span>BAG — purchase rate per bag</span>
            </>
          ) : (
            <select
              name="productUnit"
              aria-label="New product unit"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="office-control"
            >
              <option value="METER">METER</option>
              <option value="KG">KG</option>
            </select>
          )}
        </label>
      )}
      <label className="office-field">
        {kind === "bags" ? "Lot / bag reference" : "Lot / thaan number"}
        <input
          aria-label="Lot number"
          name="lot"
          placeholder="As written on the delivery slip"
          className="office-control"
          required
        />
      </label>
      <label className="office-field">
        Quantity <small>· {unit ?? "choose a product for its unit"}</small>
        <input
          aria-label="Quantity received"
          name="quantity"
          type="number"
          min="0.001"
          step="0.001"
          placeholder="0.000"
          className="office-control"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>
      {canPrice && (
        <>
          <label className="office-field">
            Purchase rate{" "}
            <small>· Rs / {unit?.toLowerCase() ?? "unit"} · optional</small>
            <input
              aria-label="Receipt purchase rate"
              name="purchaseRate"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Rate paid to the mill"
              className="office-control"
              value={purchaseRate}
              onChange={(e) => setPurchaseRate(e.target.value)}
            />
          </label>
          <div className="office-field">
            Purchase amount
            <output
              aria-label="Receipt purchase amount"
              className="office-control tabular-nums"
            >
              {amount}
            </output>
          </div>
        </>
      )}
      <label className="office-field md:col-span-2">
        Quality &amp; storage notes <small>· optional</small>
        <input
          aria-label="Cloth details"
          name="detail"
          placeholder="Shade, count/quality, godown/rack"
          className="office-control"
          maxLength={500}
        />
      </label>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 md:col-span-2">
        <p className="office-note max-w-md">
          {canPrice
            ? "Enter the purchase rate to save to stock and the mill’s account now. Leave it blank to price later. Set the selling rate when making the bill."
            : "The bookkeeper adds the purchase rate before this lot becomes available to sell."}
        </p>
        <button
          aria-label={`Save ${kind} receipt`}
          className="office-button"
          disabled={pending || !ready || !requestKey}
        >
          {pending
            ? "Saving…"
            : purchaseRate && canPrice
              ? "Save receipt"
              : "Save for pricing"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
export function PriceReceiptForm({ id, unit }: { id: string; unit?: string }) {
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
        Purchase rate <small>· Rs / {unit?.toLowerCase() ?? "unit"}</small>
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
      <p className="office-note">
        Set the selling rate later when making the sales bill.
      </p>
      <button className="office-button" disabled={pending}>
        {pending ? "Posting…" : "Price and post receipt"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
