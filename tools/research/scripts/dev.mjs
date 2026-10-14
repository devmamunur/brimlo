// Runs the API (8787) and the dashboard dev server (5173) together. Ctrl+C stops both.
import { spawn } from "node:child_process";
const run = (name, cmd, args, cwd) => {
  const p = spawn(cmd, args, { cwd, stdio: ["ignore", "inherit", "inherit"] });
  p.on("exit", (code) => {
    console.log(`[${name}] stopped (${code})`);
    for (const c of children) c.kill();
    process.exit(code ?? 0);
  });
  return p;
};
const children = [run("api", "node_modules/.bin/tsx", ["packages/api/src/index.ts"], "."), run("dashboard", "node_modules/.bin/vite", [], "apps/dashboard")];
console.log("\nDashboard: http://localhost:5173  (API on 8787)\n");
