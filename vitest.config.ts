import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/..." paths the app uses, so tests can import modules that use them.
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    // These tests are pure functions with no shared global state, so one worker runs them all
    // instead of paying process startup per file.
    isolate: false,
    // Reuses transformed modules between runs.
    fsModuleCache: true,
  },
});
