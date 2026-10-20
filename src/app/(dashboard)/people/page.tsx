import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PeopleForm, OwnerPinForm } from "@/components/people-form";
import { disablePerson } from "./actions";
export default async function PeoplePage() {
  const session = await getActiveSession();
  if (session?.user?.role !== "OWNER") redirect("/desk");
  const people = await db.user.findMany({
    where: { companyId: session.user.companyId, role: { not: "OWNER" } },
    select: { id: true, name: true, role: true, isActive: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-bold">People and pins</h1>
      <p>
        Each person uses the mill login, then their own PIN. Only the owner sees
        everything.
      </p>
      <PeopleForm />
      {people.map((p) => (
        <section key={p.id} className="space-y-2">
          <PeopleForm person={p} />
          {p.isActive ? (
            <form action={disablePerson}>
              <input name="id" type="hidden" value={p.id} />
              <button className="text-sm text-red-700 underline">
                Disable {p.name}
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">Disabled</p>
          )}
        </section>
      ))}
      <OwnerPinForm />
    </div>
  );
}
