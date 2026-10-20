import { db } from "@/lib/db";
import Link from "next/link";
import { AuthShell } from "@/components/office-design";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify Email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <Result success={false} message="No verification token provided." />;
  }

  const user = await db.user.findFirst({ where: { verificationToken: token } });

  if (!user) {
    return (
      <Result
        success={false}
        message="This verification link is invalid or has already been used."
      />
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });

  return (
    <Result
      success={true}
      message="Your email has been verified. You can now sign in."
    />
  );
}

function Result({ success, message }: { success: boolean; message: string }) {
  return (
    <AuthShell>
      <p className="office-kicker">Office login</p>
      <h1>{success ? "Email verified." : "Verification failed."}</h1>
      <p className="office-intro">{message}</p>
      <Link href="/login" className="office-button mt-6">
        Go to sign in
      </Link>
    </AuthShell>
  );
}
