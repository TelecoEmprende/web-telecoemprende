import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    // 1s (el defecto) se queda corto montando los componentes de Radix en
    // jsdom: daba fallos intermitentes que no eran fallos de código.
    testTimeout: 8000,
  },
});
