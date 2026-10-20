"use client";
import { useActionState } from "react";
import { savePerson, changeOwnerPin } from "@/app/(dashboard)/people/actions";
export function PeopleForm({
  person,
}: {
  person?: { id: string; name: string; role: string };
}) {
  const [state, action, pending] = useActionState(savePerson, null);
  return (
    <form
      action={action}
      className="grid gap-3 rounded border bg-white p-4 md:grid-cols-4"
    >
      <input name="id" type="hidden" value={person?.id ?? ""} />
      <input
        aria-label="Person name"
        className="rounded border p-2"
        name="name"
        placeholder="Person’s name"
        defaultValue={person?.name}
        required
        maxLength={100}
      />
      <select
        aria-label="Person role"
        className="rounded border p-2"
        name="role"
        defaultValue={person?.role ?? "SALESMAN"}
      >
        <option value="STOREKEEPER">Godown keeper</option>
        <option value="SALESMAN">Salesman</option>
        <option value="ACCOUNTANT">Bookkeeper</option>
      </select>
      <input
        aria-label="New PIN"
        className="rounded border p-2"
        type="password"
        inputMode="numeric"
        name="pin"
        pattern="[0-9]{4}"
        maxLength={4}
        placeholder="New 4-digit PIN"
        required
        autoComplete="new-password"
      />
      <button
        className="rounded bg-blue-600 p-2 text-white disabled:opacity-50"
        disabled={pending}
      >
        {pending ? "Saving…" : person ? "Update and reset PIN" : "Add person"}
      </button>
      {state?.error && (
        <p role="alert" className="text-red-600 md:col-span-4">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-green-700">
          Saved.
        </p>
      )}
    </form>
  );
}
export function OwnerPinForm() {
  const [state, action, pending] = useActionState(changeOwnerPin, null);
  return (
    <form action={action} className="mt-6 grid max-w-sm gap-3">
      <h2 className="font-semibold">Change owner PIN</h2>
      <input
        aria-label="Current owner PIN"
        className="rounded border p-2"
        type="password"
        inputMode="numeric"
        name="currentPin"
        pattern="[0-9]{4}"
        placeholder="Current PIN"
        required
      />
      <input
        aria-label="New owner PIN"
        className="rounded border p-2"
        type="password"
        inputMode="numeric"
        name="pin"
        pattern="[0-9]{4}"
        placeholder="New 4-digit PIN"
        required
      />
      <button
        disabled={pending}
        className="rounded bg-slate-900 p-2 text-white"
      >
        Change PIN and lock all owner desks
      </button>
      {state?.error && <p role="alert">{state.error}</p>}
      {state?.ok && <a href="/desk">PIN changed. Open your desk again.</a>}
    </form>
  );
}
