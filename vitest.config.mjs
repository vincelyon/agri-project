import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration tests run against a separate database so dev data is never touched.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://agri@127.0.0.1:54329/agri_stock_test?schema=public";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.js", "tests/integration/**/*.test.js"],
    globalSetup: ["./tests/global-setup.js"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      SESSION_SECRET: "test-secret-test-secret-test-secret",
    },
    fileParallelism: false, // integration files share one database
    testTimeout: 30000,
  },
});
