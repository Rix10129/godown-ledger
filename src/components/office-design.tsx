import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";
import { OFFICE_NAME } from "@/lib/office-branding";

export function WovenMark({ className = "" }: { className?: string }) {
  return (
    <span className={`woven-mark ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 30 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M6 7h18M6 23h18M9 7v16M15 7v16M21 7v16M6 11h18M6 15h18M6 19h18" />
      </svg>
    </span>
  );
}
export function AuthShell({
  children,
  companyName = OFFICE_NAME,
}: {
  children: ReactNode;
  companyName?: string;
}) {
  return (
    <main className="office-auth">
      <section className="office-auth-story" aria-label={companyName}>
        <div className="office-identity">
          <WovenMark />
          <div>
            <strong>{companyName}</strong>
            <small>Mill-to-market trading</small>
          </div>
        </div>
        <div className="office-auth-message">
          <p className="office-kicker">The office book</p>
          <h2>
            Every lot.
            <br />
            Every bill.
            <br />
            One clear book.
          </h2>
          <p>
            Mills, godown, recovery and accounts, together in one shared office.
          </p>
        </div>
        <p className="office-auth-footer">
          Godown Ledger · Personal desks for every person
        </p>
      </section>
      <section className="office-auth-form">
        <div>{children}</div>
      </section>
    </main>
  );
}
export function OfficeHeading({
  kicker,
  title,
  children,
  action,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="office-page-heading">
      <div>
        <p className="office-kicker">{kicker}</p>
        <h1>{title}</h1>
        {children && <p className="office-intro">{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="office-empty">
      <PackageOpen aria-hidden="true" />
      <h3>{title}</h3>
      <p>{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
