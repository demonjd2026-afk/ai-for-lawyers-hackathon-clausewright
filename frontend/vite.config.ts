import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../backend/static",
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0, // keep fonts as files so the CSP can stay at font-src self

    rollupOptions: {
      output: {
        // viem is only needed on the escrow step; keep it out of the first paint.
        manualChunks: (id) => (id.includes("node_modules/viem") || id.includes("node_modules/ox") ? "chain" : undefined),
      },
    },
  },
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
