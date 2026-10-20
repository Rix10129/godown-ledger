"use client";
import { useActionState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/office-design";
import { requestPasswordReset, type ForgotState } from "./actions";
export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    requestPasswordReset,
    null,
  );
  return (
    <AuthShell>
      <p className="office-kicker">Office login</p>
      <h1>
        {state && "success" in state
          ? "Check your inbox."
          : "Forgot your password?"}
      </h1>
      {state && "success" in state ? (
        <p className="office-intro">
          If an account exists for that email, we’ve sent a reset link. The link
          expires in one hour.
        </p>
      ) : (
        <>
          <p className="office-intro">
            Enter the office email to request a password reset link.
          </p>
          <form action={formAction}>
            <label className="office-field">
              Email address
              <input
                className="office-control"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Your office email"
              />
            </label>
            {state && "error" in state && (
              <p role="alert" className="office-alert mb-5">
                {state.error}
              </p>
            )}
            <button className="office-button" type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <Link href="/login" className="office-button-quiet mt-5">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
