import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveInsideRoot } from "./mediaPathUtils";

const tempRoot = path.join(os.tmpdir(), "ascend-nexus-media-processing");

export const createProcessingTempDir = async (processingJobId: string): Promise<string> => {
  const safeJobId = processingJobId.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const dir = resolveInsideRoot(tempRoot, safeJobId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const cleanupProcessingTempDir = async (processingJobId: string): Promise<void> => {
  const safeJobId = processingJobId.replace(/[^a-zA-Z0-9._-]+/g, "-");
  await fs.rm(resolveInsideRoot(tempRoot, safeJobId), { recursive: true, force: true });
};
