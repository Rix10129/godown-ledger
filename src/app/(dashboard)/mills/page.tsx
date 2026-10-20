import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
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
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">Mills</h1>
      {session.user.role !== "ACCOUNTANT" && <MillForm />}
      <ul className="divide-y rounded border bg-white">
        {mills.map((m) => (
          <li key={m.id} className="p-4">
            <strong>{m.name}</strong>
            <p className="text-sm text-slate-500">{m.address}</p>
          </li>
        ))}
      </ul>
      {!mills.length && <p>Add the first mill to begin receiving cloth.</p>}
    </div>
  );
}
