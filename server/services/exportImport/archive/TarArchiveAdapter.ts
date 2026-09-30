import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

export interface ArchiveEntryChecksum {
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  mediaType?: string;
  recordType?: string;
}

export interface ArchiveEntryInfo {
  path: string;
  size: number;
  type: "file";
  offset: number;
}

const blockSize = 512;
const allowedTopLevel = new Set(["manifest.json", "package.json", "checksums.sha256", "records", "assets", "derivatives", "reports", "signature", "encryption"]);

export class ArchiveSafetyPolicyService {
  readonly maximumEntryCount = 100_000;
  readonly maximumEntryBytes = 5 * 1024 * 1024 * 1024;
  readonly maximumPackageBytes = 25 * 1024 * 1024 * 1024;

  validateEntryPath(entryPath: string): string {
    const normalized = entryPath.replaceAll("\\", "/").replace(/^\/+/, "");
    if (!normalized || normalized.includes("\0")) throw new Error("IMPORT_ARCHIVE_SAFETY_VIOLATION");
    if (normalized.startsWith("../") || normalized.includes("/../") || path.isAbsolute(normalized) || /^[a-zA-Z]:/.test(normalized)) {
      throw new Error("IMPORT_ARCHIVE_SAFETY_VIOLATION");
    }
    const topLevel = normalized.includes("/") ? normalized.split("/")[0] : normalized;
    if (!allowedTopLevel.has(topLevel)) throw new Error(`IMPORT_ARCHIVE_UNEXPECTED_ENTRY:${topLevel}`);
    return normalized;
  }

  validateEntrySize(size: number): void {
    if (!Number.isFinite(size) || size < 0 || size > this.maximumEntryBytes) throw new Error("IMPORT_ARCHIVE_ENTRY_TOO_LARGE");
  }
}

export const archiveSafetyPolicyService = new ArchiveSafetyPolicyService();

const checksum = () => crypto.createHash("sha256");
const octal = (value: number, length: number) => value.toString(8).padStart(length - 1, "0").slice(0, length - 1) + "\0";
const writeString = (target: Buffer, offset: number, length: number, value: string) => target.write(value.slice(0, length).padEnd(length, "\0"), offset, length, "utf8");

const buildHeader = (entryPath: string, size: number): Buffer => {
  const safePath = archiveSafetyPolicyService.validateEntryPath(entryPath);
  archiveSafetyPolicyService.validateEntrySize(size);
  if (Buffer.byteLength(safePath) > 100) throw new Error("EXPORT_ARCHIVE_PATH_TOO_LONG");
  const header = Buffer.alloc(blockSize, 0);
  writeString(header, 0, 100, safePath);
  writeString(header, 100, 8, octal(0o644, 8));
  writeString(header, 108, 8, octal(0, 8));
  writeString(header, 116, 8, octal(0, 8));
  writeString(header, 124, 12, octal(size, 12));
  writeString(header, 136, 12, octal(Math.floor(Date.now() / 1000), 12));
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeString(header, 257, 6, "ustar");
  writeString(header, 263, 2, "00");
  const sum = [...header].reduce((total, byte) => total + byte, 0);
  writeString(header, 148, 8, octal(sum, 8));
  return header;
};

const paddingFor = (size: number) => (blockSize - (size % blockSize)) % blockSize;

export class TarExportArchiveAdapter {
  private readonly output: fs.WriteStream;
  private readonly seen = new Set<string>();
  private bytesWritten = 0;
  readonly checksums: ArchiveEntryChecksum[] = [];

  constructor(private readonly outputPath: string) {
    this.output = fs.createWriteStream(outputPath);
  }

  async addJsonEntry(entryPath: string, value: unknown, recordType?: string): Promise<void> {
    const payload = Buffer.from(JSON.stringify(value, null, 2));
    await this.addBufferEntry(entryPath, payload, { mediaType: "application/json", recordType });
  }

  async addNdjsonEntry(entryPath: string, values: Iterable<unknown>, recordType: string): Promise<void> {
    const lines = [...values].map((value) => JSON.stringify(value)).join("\n") + "\n";
    await this.addBufferEntry(entryPath, Buffer.from(lines), { mediaType: "application/x-ndjson", recordType });
  }

  async addBufferEntry(entryPath: string, buffer: Buffer, metadata: { mediaType?: string; recordType?: string } = {}): Promise<void> {
    const safePath = this.reserve(entryPath);
    const header = buildHeader(safePath, buffer.byteLength);
    const digest = crypto.createHash("sha256").update(buffer).digest("hex");
    await this.write(header);
    await this.write(buffer);
    await this.writePadding(buffer.byteLength);
    this.checksums.push({ relativePath: safePath, sha256: digest, sizeBytes: buffer.byteLength, ...metadata });
  }

  async addBinaryEntry(entryPath: string, sourcePath: string, metadata: { mediaType?: string; recordType?: string } = {}): Promise<void> {
    const safePath = this.reserve(entryPath);
    const stat = await fsp.stat(sourcePath);
    archiveSafetyPolicyService.validateEntrySize(stat.size);
    await this.write(buildHeader(safePath, stat.size));
    const digest = checksum();
    await pipeline(
      fs.createReadStream(sourcePath),
      async function* (source) {
        for await (const chunk of source) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          digest.update(buffer);
          yield buffer;
        }
      },
      this.output,
      { end: false },
    );
    this.bytesWritten += stat.size;
    await this.writePadding(stat.size);
    this.checksums.push({ relativePath: safePath, sha256: digest.digest("hex"), sizeBytes: stat.size, ...metadata });
  }

  async finalize(): Promise<void> {
    await this.write(Buffer.alloc(blockSize * 2, 0));
    await new Promise<void>((resolve, reject) => {
      this.output.end(() => resolve());
      this.output.once("error", reject);
    });
  }

  getProgress(): { bytesWritten: number; entries: number } {
    return { bytesWritten: this.bytesWritten, entries: this.seen.size };
  }

  private reserve(entryPath: string): string {
    const safePath = archiveSafetyPolicyService.validateEntryPath(entryPath);
    if (this.seen.has(safePath)) throw new Error(`EXPORT_ARCHIVE_DUPLICATE_ENTRY:${safePath}`);
    this.seen.add(safePath);
    if (this.seen.size > archiveSafetyPolicyService.maximumEntryCount) throw new Error("EXPORT_ARCHIVE_ENTRY_LIMIT");
    return safePath;
  }

  private async write(buffer: Buffer): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.output.write(buffer, (error) => error ? reject(error) : resolve());
    });
    this.bytesWritten += buffer.byteLength;
  }

  private async writePadding(size: number): Promise<void> {
    const padding = paddingFor(size);
    if (padding > 0) await this.write(Buffer.alloc(padding, 0));
  }
}

export class TarImportArchiveReader {
  private entries: ArchiveEntryInfo[] = [];
  private archive?: Buffer;

  async open(archivePath: string): Promise<void> {
    const stat = await fsp.stat(archivePath);
    if (stat.size > archiveSafetyPolicyService.maximumPackageBytes) throw new Error("IMPORT_ARCHIVE_TOO_LARGE");
    this.archive = await fsp.readFile(archivePath);
    this.entries = [];
    const seen = new Set<string>();
    let offset = 0;
    while (offset + blockSize <= this.archive.byteLength) {
      const header = this.archive.subarray(offset, offset + blockSize);
      if (header.every((byte) => byte === 0)) break;
      const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
      const typeFlag = header.subarray(156, 157).toString("utf8");
      if (typeFlag && typeFlag !== "0") throw new Error("IMPORT_ARCHIVE_UNSUPPORTED_ENTRY_TYPE");
      const sizeText = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
      const size = Number.parseInt(sizeText || "0", 8);
      const safePath = archiveSafetyPolicyService.validateEntryPath(name);
      archiveSafetyPolicyService.validateEntrySize(size);
      if (seen.has(safePath)) throw new Error("IMPORT_ARCHIVE_DUPLICATE_ENTRY");
      seen.add(safePath);
      const dataOffset = offset + blockSize;
      this.entries.push({ path: safePath, size, type: "file", offset: dataOffset });
      offset = dataOffset + size + paddingFor(size);
    }
  }

  listEntries(): ArchiveEntryInfo[] {
    return [...this.entries];
  }

  readEntryBuffer(entryPath: string): Buffer {
    if (!this.archive) throw new Error("IMPORT_ARCHIVE_NOT_OPEN");
    const entry = this.entries.find((item) => item.path === entryPath);
    if (!entry) throw new Error(`IMPORT_ARCHIVE_ENTRY_MISSING:${entryPath}`);
    return this.archive.subarray(entry.offset, entry.offset + entry.size);
  }

  readJson<T>(entryPath: string): T {
    return JSON.parse(this.readEntryBuffer(entryPath).toString("utf8")) as T;
  }

  readNdjson<T>(entryPath: string): T[] {
    const content = this.readEntryBuffer(entryPath).toString("utf8").trim();
    return content ? content.split("\n").map((line) => JSON.parse(line) as T) : [];
  }

  verifyChecksums(): { valid: boolean; errors: string[]; checkedAt: string } {
    const checksumText = this.readEntryBuffer("checksums.sha256").toString("utf8");
    const errors: string[] = [];
    for (const line of checksumText.trim().split("\n").filter(Boolean)) {
      const [hash, relativePath] = line.split(/\s+/, 2);
      const actual = crypto.createHash("sha256").update(this.readEntryBuffer(relativePath)).digest("hex");
      if (hash !== actual) errors.push(`Checksum mismatch for ${relativePath}.`);
    }
    return { valid: errors.length === 0, errors, checkedAt: new Date().toISOString() };
  }
}
