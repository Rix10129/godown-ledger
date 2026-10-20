"use client";
import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { AuthShell } from "@/components/office-design";
import { DESK_LABELS as labels } from "@/lib/office-branding";
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
  const person = desk?.people.find((p) => p.id === personId);
  const access: Record<string, string> = {
    OWNER: "All office work. Keep the owner PIN private.",
    STOREKEEPER: "Mills and stock. Financial work stays closed.",
    SALESMAN: "Bills and recovery. Books stay closed.",
    CASHIER: "Bills and recovery. Books stay closed.",
    ACCOUNTANT: "Recovery, books, the evening note and ledger.",
  };
  return (
    <AuthShell companyName={desk?.company}>
      <p className="office-kicker">
        {desk?.company ?? "Opening the office…"} · Personal desk
      </p>
      <h1>
        {desk?.needsOwnerPin ? "Set the owner PIN" : "Who’s at the desk?"}
      </h1>
      <p className="office-intro">
        {desk?.needsOwnerPin
          ? "Set your private owner PIN, then add each person under More → People and pins."
          : "Choose your name and enter your own four-digit PIN."}
      </p>
      <form onSubmit={open}>
        {!desk?.needsOwnerPin && (
          <label className="office-field">
            Your name
            <select
              aria-label="Person"
              className="office-control"
              value={personId}
              disabled={!desk || busy}
              onChange={(e) => {
                setPersonId(e.target.value);
                setPin("");
                setError("");
              }}
            >
              {!desk && <option>Loading people…</option>}
              {desk?.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {labels[p.role] ?? p.role}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="office-field">
          4-digit PIN
          <input
            aria-label="4-digit PIN"
            className="office-control office-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{4}"
            minLength={4}
            maxLength={4}
            placeholder="••••"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        {desk?.needsOwnerPin && (
          <label className="office-field">
            Confirm PIN
            <input
              aria-label="Confirm PIN"
              className="office-control office-pin"
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
        {person && (
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-blue-600">
              {labels[person.role] ?? person.role}’s desk
            </p>
            <p className="office-note mt-1">
              {access[person.role] ??
                "Only work assigned to this desk is available."}
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="office-alert mb-5">
            {error}
          </p>
        )}
        <button disabled={busy || !desk} className="office-button">
          {busy ? "Checking…" : "Open my work"}
        </button>
      </form>
      <button
        className="office-button-quiet mt-3"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out of this office
      </button>
      <p className="office-note mt-6 text-center">
        Leave the desk when you finish.
      </p>
    </AuthShell>
  );
}
