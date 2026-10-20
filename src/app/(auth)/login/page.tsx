"use client";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/office-design";
import { OFFICE_NAME } from "@/lib/office-branding";
export default function LoginPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    if (searchParams.get("reason") === "session_replaced")
      setNotice(
        "Your previous session ended. Sign in again to open your desk.",
      );
  }, [searchParams]);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setError(
          result.error === "SUSPENDED"
            ? "This office account is suspended. Contact the owner."
            : result.error === "PENDING_APPROVAL"
              ? "This office account is awaiting approval."
              : "Invalid email or password. Please try again.",
        );
      } else if (result?.ok) window.location.assign("/desk");
      else setError("Could not sign in. Please try again.");
    } catch {
      setError(
        "Could not reach the office. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthShell>
      <p className="office-kicker">Welcome to {OFFICE_NAME}</p>
      <h1>Open the office book.</h1>
      <p className="office-intro">Sign in, then choose your personal desk.</p>
      {notice && (
        <p className="office-success mt-5" role="status">
          {notice}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <label className="office-field" htmlFor="email">
          Email address
          <input
            className="office-control"
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="Your office email"
          />
        </label>
        <label className="office-field" htmlFor="password">
          Password
          <span className="relative block">
            <input
              className="office-control !pr-12"
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Your office password"
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
              className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded text-slate-500 hover:bg-slate-100"
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </span>
        </label>
        {error && (
          <p role="alert" className="office-alert mb-5">
            {error}
          </p>
        )}
        <div className="mb-6 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-blue-600 underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="office-button"
          aria-label="Sign in"
        >
          {loading ? (
            "Signing in…"
          ) : (
            <>
              Continue to your desk{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
      <p className="office-note mt-6 text-center">
        Use the office login supplied by the owner.
      </p>
    </AuthShell>
  );
}
