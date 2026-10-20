import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/providers";
import "./globals.css";
import { OFFICE_NAME } from "@/lib/office-branding";

export const metadata: Metadata = {
  title: {
    default: `${OFFICE_NAME} | Office book`,
    template: `%s | ${OFFICE_NAME}`,
  },
  description: "Textile Trading & Mill-to-Market Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Godown Ledger",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full antialiased">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
