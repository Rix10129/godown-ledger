"use client";
import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
const labels: Record<string, string> = {
  OWNER: "Owner",
  STOREKEEPER: "Godown keeper",
  SALESMAN: "Salesman",
  ACCOUNTANT: "Bookkeeper",
  CASHIER: "Cashier",
  ADMIN: "Administrator",
};
export default function DeskPage() {
  const [desk, setDesk] = useState<{
    company: string;
    ownerId: string;
    needsOwnerPin: boolean;
    people: { id: string; name: string; role: string }[];
  }>();
  const [personId, setPersonId] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/desk/people", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          window.location.assign("/login");
          return;
        }
        const value = await r.json();
        setDesk(value);
        setPersonId(value.ownerId);
      })
      .catch(() =>
        setError("Could not open the desk. Check the connection and reload."),
      );
  }, []);
  async function open(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (desk?.needsOwnerPin && pin !== confirm) {
      setError("The two PINs do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await signIn("credentials", {
        mode: desk?.needsOwnerPin ? "setup" : "pin",
        personId,
        pin,
        redirect: false,
      });
      if (result?.error || !result?.ok) {
        setError(
          "That PIN did not open the desk. After 5 wrong attempts, wait 15 minutes.",
        );
        setPin("");
      } else window.location.assign("/");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
      <div className="w-full max-w-md space-y-5">
        <p className="text-sm text-blue-300">
          {desk?.company ?? "Opening the mill…"}
        </p>
        <h1 className="text-3xl font-bold">
          {desk?.needsOwnerPin ? "Set the owner PIN" : "Who is sitting here?"}
        </h1>
        <p className="text-slate-300">
          {desk?.needsOwnerPin
            ? "The owner sets this once, then adds each person under More → People and pins."
            : "One mill login. Each person opens only their own work."}
        </p>
        <form onSubmit={open} className="space-y-4">
          {!desk?.needsOwnerPin && (
            <label className="block">
              Person
              <select
                aria-label="Person"
                className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-3"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                {desk?.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {labels[p.role] ?? p.role}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            4-digit PIN
            <input
              aria-label="4-digit PIN"
              className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-3"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{4}"
              minLength={4}
              maxLength={4}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          {desk?.needsOwnerPin && (
            <label className="block">
              Confirm PIN
              <input
                aria-label="Confirm PIN"
                className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-3"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
          <button
            disabled={busy || !desk}
            className="w-full rounded bg-blue-600 p-3 font-semibold disabled:opacity-50"
          >
            {busy ? "Checking…" : "Open my work"}
          </button>
        </form>
        <button
          className="text-sm text-slate-400 underline"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out of this mill
        </button>
      </div>
    </main>
  );
}
