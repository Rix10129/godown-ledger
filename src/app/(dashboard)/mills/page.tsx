import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OfficeHeading, EmptyState } from "@/components/office-design";
import { MillForm } from "@/components/godown-forms";
export default async function MillsPage() {
  const session = await getActiveSession();
  if (
    !session?.user ||
    !["OWNER", "STOREKEEPER", "ACCOUNTANT"].includes(session.user.role)
  )
    redirect("/desk");
  const mills = await db.supplier.findMany({
    where: { companyId: session.user.companyId },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-6">
      <OfficeHeading
        kicker="02 / Godown & mills"
        title="Mills"
        action={
          session.user.role !== "STOREKEEPER" ? (
            <Link href="/suppliers" className="office-button-quiet">
              Mill accounts
            </Link>
          ) : undefined
        }
      >
        The mills and suppliers behind your cloth deliveries.
      </OfficeHeading>
      {session.user.role !== "ACCOUNTANT" && (
        <section className="office-panel">
          <div className="office-panel-head">
            <h2>Add a mill</h2>
          </div>
          <div className="office-panel-body">
            <MillForm />
          </div>
        </section>
      )}
      <section className="office-panel">
        <div className="office-panel-head">
          <h2>Mills on file</h2>
          <span className="office-status">{mills.length} mills</span>
        </div>
        <ul className="divide-y divide-slate-200">
          {mills.map((m) => (
            <li key={m.id} className="px-5 py-4">
              <p className="text-sm font-semibold">{m.name}</p>
              <p className="office-note mt-1">
                {m.address || "No city or address entered"}
              </p>
            </li>
          ))}
        </ul>
        {!mills.length && (
          <EmptyState title="Add your first mill">
            Keep mill names here so the keeper can record deliveries against the
            right supplier.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
