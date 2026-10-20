"use client";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/office-design";
import { resetPassword, type ResetState } from "./actions";
export default function ResetPasswordPage() {
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetPassword,
    null,
  );
  if (state && "success" in state)
    return (
      <AuthShell>
        <p className="office-kicker">Office login</p>
        <h1>Password updated.</h1>
        <p className="office-intro">
          Your password has been changed. You can now sign in to the office.
        </p>
        <Link href="/login" className="office-button mt-6">
          Sign in
        </Link>
      </AuthShell>
    );
  if (!token)
    return (
      <AuthShell>
        <p className="office-kicker">Office login</p>
        <h1>This reset link is incomplete.</h1>
        <p className="office-intro">
          Request a new reset link to change your password.
        </p>
        <Link href="/forgot-password" className="office-button mt-6">
          Request a reset link
        </Link>
      </AuthShell>
    );
  return (
    <AuthShell>
      <p className="office-kicker">Office login</p>
      <h1>Set a new password.</h1>
      <p className="office-intro">
        Use a strong password that is only used for this office.
      </p>
      <form action={formAction}>
        <input name="token" type="hidden" value={token} />
        <label className="office-field">
          New password
          <input
            className="office-control"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="At least 8 characters"
          />
        </label>
        <label className="office-field">
          Confirm new password
          <input
            className="office-control"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Enter the new password again"
          />
        </label>
        {state && "error" in state && (
          <p role="alert" className="office-alert mb-5">
            {state.error}
          </p>
        )}
        <button className="office-button" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
      <Link href="/login" className="office-button-quiet mt-3">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
