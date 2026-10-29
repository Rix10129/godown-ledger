"use client";
import { useActionState, useEffect, type ReactNode } from "react";
export type WorkflowState = { error?: string; success?: string } | null;
export function WorkflowForm({
  action,
  children,
  label = "Save",
}: {
  action: (state: WorkflowState, form: FormData) => Promise<WorkflowState>;
  children: ReactNode;
  label?: string;
}) {
  const [state, submit, pending] = useActionState(action, null);
  const [requestKey, setRequestKey] = useState("");
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    setRequestKey(crypto.randomUUID());
    if (state?.success) setFormKey((n) => n + 1);
  }, [state]);
  return (
    <form
      key={formKey}
      action={submit}
      className="space-y-3 rounded-xl border bg-white p-5 [&_input]:block [&_input]:w-full [&_input]:rounded [&_input]:border [&_input]:p-2 [&_select]:block [&_select]:w-full [&_select]:rounded [&_select]:border [&_select]:p-2 [&_textarea]:block [&_textarea]:w-full [&_textarea]:rounded [&_textarea]:border [&_textarea]:p-2"
    >
      <input type="hidden" name="requestKey" value={requestKey} />
      {state?.error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-700">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="rounded bg-green-50 p-3 text-green-800">
          {state.success}
        </p>
      )}
      {children}
      <button
        disabled={pending || !requestKey}
        className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : label}
      </button>
    </form>
  );
}
export function OrderLines({
  products,
}: {
  products: { id: string; name: string; unit: string }[];
}) {
  return <OrderRows products={products} />;
}
import { useState } from "react";
function OrderRows({
  products,
}: {
  products: { id: string; name: string; unit: string }[];
}) {
  const [rows, setRows] = useState([{ key: 0, productId: "", quantity: "" }]);
  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name="linesJson"
        value={JSON.stringify(
          rows.map(({ productId, quantity }) => ({ productId, quantity })),
        )}
      />
      {rows.map((r, i) => (
        <div
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_auto]"
          key={r.key}
        >
          <select
            required
            aria-label="Quality / colour"
            value={r.productId}
            onChange={(e) =>
              setRows(
                rows.map((v, k) =>
                  k === i ? { ...v, productId: e.target.value } : v,
                ),
              )
            }
          >
            <option value="">Select quality / colour</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
          <input
            aria-label="Ordered quantity"
            placeholder="Ordered quantity"
            required
            type="number"
            min="0.001"
            step="0.001"
            value={r.quantity}
            onChange={(e) =>
              setRows(
                rows.map((v, k) =>
                  k === i ? { ...v, quantity: e.target.value } : v,
                ),
              )
            }
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, k) => k !== i))}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="underline"
        onClick={() =>
          setRows([...rows, { key: Date.now(), productId: "", quantity: "" }])
        }
      >
        Add another quality / colour
      </button>
    </div>
  );
}
