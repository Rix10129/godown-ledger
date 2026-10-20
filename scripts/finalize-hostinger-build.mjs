// Explicitly opt in when the managed host starts Next.js without npm prestart.
// Ordinary development/CI builds never need a database connection.
import { spawnSync } from "node:child_process";

if (process.env.HOSTINGER_DEPLOY !== "true") process.exit(0);

if (!process.env.DATABASE_URL || !process.env.npm_execpath) {
  console.error("Hostinger deployment requires DATABASE_URL and npm run build.");
  process.exit(1);
}

for (const args of [
  [process.env.npm_execpath, "run", "db:deploy"],
  ["scripts/create-company.mjs", "--if-configured"],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.error("Hostinger database preparation failed; deployment stopped.");
    process.exit(result.status || 1);
  }
}
