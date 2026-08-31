import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        admin: "admin/index.html",
        gracias: "gracias/index.html",
        charlaSantiYPablo: "charla-santi-y-pablo/index.html",
      },
    },
  },
});
