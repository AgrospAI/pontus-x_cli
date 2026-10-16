import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@test": resolve(__dirname, "test"),
    },
  },
  test: {
    env: {
      NODE_NO_WARNINGS: "1",
    },
    // Configure different test patterns
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: [resolve(__dirname, "test/setup.ts")],
    // Enable test grouping and filtering
    testTimeout: 30_000, // Default timeout for most tests
  },
});
