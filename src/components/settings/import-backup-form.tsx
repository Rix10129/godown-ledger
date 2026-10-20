"use client";
import { useState } from "react";
export function ImportBackupForm() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function validate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    form.set("action", "stage");
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      setMessage(
        response.ok
          ? "The encrypted backup passed structural checks. No live data was changed. Restore it to a separate empty database with the recovery script, verify the restored book, then switch the application connection."
          : (result.error ?? "Backup validation failed"),
      );
    } catch {
      setMessage("Could not validate the backup. Check the connection.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={validate} className="mt-4 grid gap-3">
      <label>
        Encrypted office file
        <input
          className="mt-1 block w-full rounded border p-2"
          name="file"
          type="file"
          accept=".godown-backup,.json"
          required
        />
      </label>
      <label>
        Backup passphrase
        <input
          className="mt-1 block w-full rounded border p-2"
          name="passphrase"
          type="password"
          placeholder="Leave blank to use the configured backup key"
          autoComplete="off"
        />
      </label>
      <button disabled={busy} className="rounded bg-slate-900 p-3 text-white">
        {busy ? "Checking…" : "Validate backup without changing the live book"}
      </button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
