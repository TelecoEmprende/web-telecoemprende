import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Por defecto el backend local (`python app.py`). Con API_PROXY se
        // apunta a otro puerto sin tocar este archivo -- en macOS el 5000 lo
        // ocupa a veces el "AirPlay Receiver" (ver `PORT` en `app.py`). Sin el
        // prefijo VITE_ a propósito: eso es para variables del cliente, y esta
        // solo la lee el dev server.
        target: process.env.API_PROXY ?? "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        admin: "admin/index.html",
        equipo: "equipo/index.html",
        gracias: "gracias/index.html",
        charlaSantiYPablo: "charla-santi-y-pablo/index.html",
        privacidad: "privacidad/index.html",
      },
    },
  },
});
