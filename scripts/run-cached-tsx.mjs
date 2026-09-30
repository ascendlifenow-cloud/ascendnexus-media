import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const cwd = process.cwd();
const localBin = path.join(cwd, "node_modules/.bin/tsx");
const findCachedTsx = () => {
  const npxRoot = path.join(os.homedir(), ".npm/_npx");
  if (!fs.existsSync(npxRoot)) return null;
  for (const entry of fs.readdirSync(npxRoot)) {
    const cli = path.join(npxRoot, entry, "node_modules/tsx/dist/cli.mjs");
    if (fs.existsSync(cli)) return cli;
  }
  return null;
};

const findCachedTsxLoader = () => {
  const npxRoot = path.join(os.homedir(), ".npm/_npx");
  if (!fs.existsSync(npxRoot)) return null;
  for (const entry of fs.readdirSync(npxRoot)) {
    const loader = path.join(npxRoot, entry, "node_modules/tsx/dist/loader.mjs");
    if (fs.existsSync(loader)) return loader;
  }
  return null;
};

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/run-cached-tsx.mjs <file> [...args]");
  process.exit(1);
}

const cachedCli = findCachedTsx();
const cachedLoader = findCachedTsxLoader();
const command = fs.existsSync(localBin) ? localBin : process.execPath;
const commandArgs = fs.existsSync(localBin)
  ? args
  : cachedLoader
    ? ["--import", cachedLoader, ...args]
    : cachedCli
      ? [cachedCli, ...args]
      : [];
if (!commandArgs.length) {
  console.error("tsx is not installed locally and no cached npx copy was found.");
  process.exit(1);
}

const child = spawn(command, commandArgs, { stdio: "inherit", cwd, env: process.env });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
