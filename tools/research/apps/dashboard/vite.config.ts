import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev, /api goes to the local API (port 8787).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: "127.0.0.1", proxy: { "/api": { target: "http://127.0.0.1:8787", changeOrigin: false } } },
  build: { outDir: "dist", sourcemap: false, chunkSizeWarningLimit: 900 },
});
