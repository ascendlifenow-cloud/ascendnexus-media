import { spawn } from "node:child_process";

export interface ExternalProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export const runExternalProcess = (
  command: string,
  args: readonly string[] = [],
  options: { timeoutMs?: number } = {},
): Promise<ExternalProcessResult> =>
  new Promise((resolve) => {
    const child = spawn(command, [...args], { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];
    let timedOut = false;
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, options.timeoutMs)
      : undefined;

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errorChunks.push(chunk));
    child.on("error", (error) => {
      if (timeout) clearTimeout(timeout);
      resolve({ exitCode: 127, stdout: Buffer.concat(chunks).toString("utf8"), stderr: error.message, timedOut });
    });
    child.on("close", (exitCode) => {
      if (timeout) clearTimeout(timeout);
      resolve({
        exitCode,
        stdout: Buffer.concat(chunks).toString("utf8"),
        stderr: Buffer.concat(errorChunks).toString("utf8"),
        timedOut,
      });
    });
  });

export const commandAvailable = async (command: string, versionArgs: readonly string[] = ["--version"]): Promise<boolean> => {
  const result = await runExternalProcess(command, versionArgs, { timeoutMs: 5000 });
  return result.exitCode === 0;
};
