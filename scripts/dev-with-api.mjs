import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const isLan = process.argv.includes("--lan");

const children = new Set();
const spawnChild = (label, command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...options.env },
    stdio: "inherit",
  });
  children.add(child);
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (code && !shuttingDown) {
      console.error(`[dev] ${label} exited with code ${code}.`);
      shutdown(code);
    }
    if (signal && !shuttingDown) {
      console.error(`[dev] ${label} exited from signal ${signal}.`);
      shutdown(1);
    }
  });
  return child;
};

let shuttingDown = false;
const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 250).unref();
};

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

spawnChild("media-api", node, ["scripts/run-cached-tsx.mjs", "server/index.ts"], {
  env: isLan ? { MEDIA_API_HOST: "0.0.0.0" } : {},
});

spawnChild("vite", path.join(projectRoot, "node_modules/.bin/vite"), [
  "--host",
  "0.0.0.0",
  "--port",
  "5303",
  "--strictPort",
]);
