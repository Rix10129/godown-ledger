// One-time bootstrap for a NEW installation. Never changes an existing password or PIN.
import fs from "node:fs";
if (fs.existsSync(".env")) process.loadEnvFile(".env");
const required = [
  "INITIAL_COMPANY_NAME",
  "INITIAL_OWNER_NAME",
  "INITIAL_OWNER_EMAIL",
  "INITIAL_OWNER_PASSWORD",
  "INITIAL_OWNER_PIN",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  if (
    process.argv.includes("--if-configured") &&
    missing.length === required.length
  )
    process.exit(0);
  console.error(
    `Set these secure environment variables before client setup: ${missing.join(", ")}`,
  );
  process.exit(1);
}
if (
  !process.env.DATABASE_URL ||
  process.env.INITIAL_OWNER_PASSWORD.length < 12 ||
  !/^\d{4}$/.test(process.env.INITIAL_OWNER_PIN)
) {
  console.error(
    "DATABASE_URL, a password of at least 12 characters, and a 4-digit owner PIN are required.",
  );
  process.exit(1);
}
const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");
const { default: bcrypt } = await import("bcryptjs");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  max: 2,
});
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
async function initialize() {
  // Routine deployments must not acquire a setup transaction for an existing client.
  // The explicit client:setup command retains its identity checks below.
  if (process.argv.includes("--if-configured")) {
    const initialized = await db.company.findFirst({ select: { id: true } });
    if (initialized) {
      console.log(
        "Client database already initialized; first-time setup skipped.",
      );
      return;
    }
  }
  const email = process.env.INITIAL_OWNER_EMAIL.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Owner email must be a valid email address");
  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(172952, 10129)`;
      const existing = await tx.user.findFirst({
        where: { email, role: "OWNER" },
        include: { company: true },
      });
      if (existing) {
        if (existing.company.name !== process.env.INITIAL_COMPANY_NAME)
          throw new Error(
            "That owner already belongs to another company. No changes made.",
          );
        console.log(
          "Client already initialized; credentials and data left unchanged.",
        );
        return;
      }
      if (await tx.company.count())
        throw new Error(
          "This database already contains a company. Use a separate empty client database; no data changed.",
        );
      const company = await tx.company.create({
        data: {
          name: process.env.INITIAL_COMPANY_NAME.trim(),
          email,
          address: process.env.INITIAL_COMPANY_ADDRESS ?? "Lahore",
          currency: "PKR",
          status: "ACTIVE",
        },
      });
      await tx.user.create({
        data: {
          companyId: company.id,
          name: process.env.INITIAL_OWNER_NAME.trim(),
          email,
          password: await bcrypt.hash(process.env.INITIAL_OWNER_PASSWORD, 12),
          pinHash: await bcrypt.hash(process.env.INITIAL_OWNER_PIN, 12),
          role: "OWNER",
          emailVerified: true,
        },
      });
      const accounts = [
        ["1000", "Cash", "ASSET"],
        ["1010", "Bank", "ASSET"],
        ["1020", "Cheques in Hand (Undeposited)", "ASSET"],
        ["1100", "Accounts Receivable", "ASSET"],
        ["1200", "Inventory", "ASSET"],
        ["1300", "Input Tax", "ASSET"],
        ["2000", "Accounts Payable", "LIABILITY"],
        ["2050", "Cheques Issued (Outstanding)", "LIABILITY"],
        ["2100", "Output Tax", "LIABILITY"],
        ["3000", "Opening Balance Equity", "EQUITY"],
        ["4000", "Sales Revenue", "REVENUE"],
        ["4100", "Discount Allowed", "REVENUE"],
        ["5000", "Cost of Goods Sold", "EXPENSE"],
        ["6000", "Operating Expenses", "EXPENSE"],
        ["6100", "Stock Adjustment", "EXPENSE"],
      ];
      for (const [code, name, type] of accounts)
        await tx.account.create({
          data: { companyId: company.id, code, name, type, isSystem: true },
        });
      console.log(
        "Client company created with empty books and an owner. No demo data installed.",
      );
    },
    { maxWait: 15000, timeout: 30000 },
  );
}
try {
  await initialize();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Client setup failed");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
  await pool.end();
}
