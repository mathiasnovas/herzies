import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        sandbox: resolve(__dirname, "src/sandbox.html"),
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
