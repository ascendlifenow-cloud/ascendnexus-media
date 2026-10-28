import { readFile } from "node:fs/promises";
import { validateSongProductionPackage, type SongProductionPackage } from "../server/services/production/SongProductionContract";

const file = process.argv[2];
if (!file) throw new Error("Usage: validate-song-production.ts <package.json>");
try {
  const report = validateSongProductionPackage(JSON.parse(await readFile(file, "utf8")) as SongProductionPackage);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.valid ? 0 : 1;
} catch {
  console.error(JSON.stringify({ valid: false, errors: ["Package could not be read or has an invalid structure."] }));
  process.exitCode = 1;
}
