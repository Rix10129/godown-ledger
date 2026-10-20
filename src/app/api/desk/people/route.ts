import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.desk)
    return NextResponse.json(
      { error: "Sign in to the mill first" },
      { status: 401 },
    );
  const people = await db.user.findMany({
    where: {
      companyId: session.desk.companyId,
      isActive: true,
      OR: [{ pinHash: { not: null } }, { id: session.desk.millUserId }],
    },
    select: { id: true, name: true, role: true, pinHash: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    {
      company: session.desk.companyName,
      ownerId: session.desk.millUserId,
      needsOwnerPin: people.some(
        (p) => p.id === session.desk!.millUserId && !p.pinHash,
      ),
      people: people.map(({ id, name, role }) => ({ id, name, role })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
