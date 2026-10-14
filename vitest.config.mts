import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json natively.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "test/**/*.{test,spec}.{ts,tsx}",
    ],
    css: false,
  },
});
