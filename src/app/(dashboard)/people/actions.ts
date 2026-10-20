"use server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
const staffRoles = ["STOREKEEPER", "SALESMAN", "ACCOUNTANT"] as const;
export async function savePerson(
  _: { error?: string; ok?: boolean } | null,
  form: FormData,
) {
  const session = await getActiveSession();
  if (session?.user?.role !== "OWNER")
    return { error: "Only the owner manages people and PINs." };
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "");
  const pin = String(form.get("pin") ?? "");
  if (!name || !/^\d{4}$/.test(pin))
    return { error: "Enter a name and a 4-digit PIN." };
  if (!staffRoles.includes(role as (typeof staffRoles)[number]))
    return { error: "Choose godown keeper, salesman or bookkeeper." };
  const actor = session.user;
  const others = await db.user.findMany({
    where: {
      companyId: actor.companyId,
      isActive: true,
      ...(id ? { id: { not: id } } : {}),
    },
    select: { pinHash: true },
  });
  for (const other of others)
    if (other.pinHash && (await bcrypt.compare(pin, other.pinHash)))
      return {
        error: "Each person needs a different PIN. Choose another 4 digits.",
      };
  const pinHash = await bcrypt.hash(pin, 12);
  await db.$transaction(async (tx) => {
    if (id) {
      const changed = await tx.user.updateMany({
        where: { id, companyId: actor.companyId, role: { not: "OWNER" } },
        data: {
          name,
          role: role as (typeof staffRoles)[number],
          pinHash,
          pinFailures: 0,
          pinLockedUntil: null,
        },
      });
      if (!changed.count) throw new Error("Person not found");
      await tx.deskSession.updateMany({
        where: { personId: id },
        data: { revoked: true },
      });
    } else {
      const person = await tx.user.create({
        data: {
          companyId: actor.companyId,
          name,
          role: role as (typeof staffRoles)[number],
          pinHash,
          email: `${randomUUID()}@staff.invalid`,
          password: await bcrypt.hash(randomUUID(), 12),
        },
      });
      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.id,
          userName: actor.name,
          action: "CREATE",
          entity: "Person",
          entityId: person.id,
          detail: JSON.stringify({ name, role }),
        },
      });
    }
  });
  revalidatePath("/people");
  return { ok: true };
}
export async function disablePerson(form: FormData) {
  const session = await getActiveSession();
  if (session?.user?.role !== "OWNER") throw new Error("Forbidden");
  const id = String(form.get("id") ?? "");
  await db.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id, companyId: session.user.companyId, role: { not: "OWNER" } },
      data: { isActive: false },
    });
    await tx.deskSession.updateMany({
      where: { personId: id, millUserId: session.desk?.millUserId },
      data: { revoked: true },
    });
  });
  revalidatePath("/people");
}
export async function changeOwnerPin(
  _: { error?: string; ok?: boolean } | null,
  form: FormData,
) {
  const session = await getActiveSession();
  if (session?.user?.role !== "OWNER")
    return { error: "Only the owner changes this PIN." };
  const current = String(form.get("currentPin") ?? ""),
    next = String(form.get("pin") ?? "");
  if (!/^\d{4}$/.test(next)) return { error: "The PIN must be 4 digits." };
  const owner = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  if (!owner.pinHash || !(await bcrypt.compare(current, owner.pinHash)))
    return { error: "Current PIN is incorrect." };
  const staff = await db.user.findMany({
    where: {
      companyId: owner.companyId,
      id: { not: owner.id },
      isActive: true,
    },
    select: { pinHash: true },
  });
  for (const other of staff)
    if (other.pinHash && (await bcrypt.compare(next, other.pinHash)))
      return { error: "The owner PIN must differ from every staff PIN." };
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: owner.id },
      data: {
        pinHash: await bcrypt.hash(next, 12),
        pinFailures: 0,
        pinLockedUntil: null,
      },
    });
    await tx.deskSession.updateMany({
      where: { personId: owner.id },
      data: { revoked: true },
    });
  });
  return { ok: true };
}
