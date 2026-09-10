import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // The API client refuses to be built without a base URL, so every test that
    // reaches a fetcher needs one. A test that cares about a different value —
    // or about its absence — still overrides this with vi.stubEnv.
    env: { NEXT_PUBLIC_API_URL: "http://api.test" },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
