import fs from "node:fs";
if (fs.existsSync(".env")) process.loadEnvFile(".env");
const job = process.argv[2];
if (
  !["evening", "backup"].includes(job) ||
  !process.env.NEXTAUTH_URL ||
  !process.env.CRON_SECRET
) {
  console.error(
    "Usage: node scripts/scheduled-jobs.mjs evening|backup. Set NEXTAUTH_URL and CRON_SECRET securely.",
  );
  process.exit(1);
}
try {
  const response = await fetch(
    new URL(`/api/cron/${job}`, process.env.NEXTAUTH_URL),
    {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(120000),
    },
  );
  if (!response.ok)
    throw new Error(
      `${job} job failed with HTTP ${response.status}; inspect provider settings and delivery receipts.`,
    );
  console.log(
    `${job} endpoint completed successfully; provider acceptance is not confirmation of delivery to a recipient.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
