import { execSync } from "node:child_process";

export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://agri@127.0.0.1:54329/agri_stock_test?schema=public";
  const dbName = new URL(url).pathname.replace("/", "");
  if (!dbName.includes("test")) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}".`);
  }
  // Apply all migrations to a fresh/own test database.
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url },
  });
}
