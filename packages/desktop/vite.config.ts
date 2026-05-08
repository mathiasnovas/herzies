import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function devStatePlugin(): Plugin {
  const configDir = path.join(os.homedir(), ".config", "herzies");
  return {
    name: "herzies-dev-state",
    configureServer(server) {
      server.middlewares.use("/__dev/state", (_req, res) => {
        try {
          const herziePath = path.join(configDir, "herzie.json");
          const sessionPath = path.join(configDir, "session.json");
          const herzie = fs.existsSync(herziePath)
            ? JSON.parse(fs.readFileSync(herziePath, "utf-8"))
            : null;
          const session = fs.existsSync(sessionPath)
            ? JSON.parse(fs.readFileSync(sessionPath, "utf-8"))
            : null;
          // Strip HMAC sig from herzie
          if (herzie) delete herzie._sig;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ herzie, session }));
        } catch {
          res.statusCode = 500;
          res.end("{}");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devStatePlugin()],
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
