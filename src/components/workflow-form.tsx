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
export function OrderLines() {
  return <OrderRows />;
}
import { useState } from "react";
function OrderRows() {
  const [rows, setRows] = useState([
    { key: 0, name: "", unit: "BAG", quantity: "", rate: "" },
  ]);
  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name="linesJson"
        value={JSON.stringify(
          rows.map(({ name, unit, quantity, rate }) => ({
            name,
            unit,
            quantity,
            rate,
          })),
        )}
      />
      {rows.map((r, i) => (
        <div
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.4fr)_auto]"
          key={r.key}
        >
          <label>
            Quality / colour
            <input
              required
              aria-label="Quality / colour"
              placeholder="Type bag or cloth quality"
              value={r.name}
              onChange={(e) =>
                setRows(
                  rows.map((v, k) =>
                    k === i ? { ...v, name: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label>
            Unit
            <select
              aria-label="Order unit"
              value={r.unit}
              onChange={(e) =>
                setRows(
                  rows.map((v, k) =>
                    k === i ? { ...v, unit: e.target.value } : v,
                  ),
                )
              }
            >
              <option value="BAG">BAG</option>
              <option value="METER">METER</option>
              <option value="KG">KG</option>
            </select>
          </label>
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
          <label>
            Rate (Rs / unit) · optional
            <input
              aria-label="Order rate"
              placeholder="Rate"
              type="number"
              min="0.01"
              step="0.01"
              value={r.rate}
              onChange={(e) =>
                setRows(
                  rows.map((v, k) =>
                    k === i ? { ...v, rate: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
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
          setRows([
            ...rows,
            { key: Date.now(), name: "", unit: "BAG", quantity: "", rate: "" },
          ])
        }
      >
        Add another quality / colour
      </button>
    </div>
  );
}
