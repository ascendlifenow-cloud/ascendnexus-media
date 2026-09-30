import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { mediaBackendConfig } from "../../../config/mediaBackendConfig";
import type { PackageEncryptionMetadata, PackageSignatureMetadata, TrustedPackageSigner } from "../../../models/exportImport/ExportImportModels";

const nowIso = () => new Date().toISOString();
const keyRoot = () => path.join(mediaBackendConfig.dataRoot || path.join(process.cwd(), "server/data"), "export-import-keys");
const signingKeyPath = () => path.join(keyRoot(), "package-signing-key.json");
const encryptionKeyPath = () => path.join(keyRoot(), "package-encryption-key.json");
const sha256 = (value: string | Buffer) => crypto.createHash("sha256").update(value).digest("hex");

interface StoredSigningKey {
  keyId: string;
  signerId: string;
  publicKeyPem: string;
  privateKeyPem: string;
  createdAt: string;
  status: "active" | "revoked";
}

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
};

export class PackageSigningKeyProvider {
  async getActiveSigningKey(): Promise<StoredSigningKey> {
    await fs.mkdir(keyRoot(), { recursive: true, mode: 0o700 });
    const existing = await readJson<StoredSigningKey>(signingKeyPath());
    if (existing?.status === "active") return existing;
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const key: StoredSigningKey = {
      keyId: `pkg-signing-${Date.now()}`,
      signerId: "ascend-nexus-local-operator",
      publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
      privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      createdAt: nowIso(),
      status: "active",
    };
    await fs.writeFile(signingKeyPath(), JSON.stringify(key, null, 2), { mode: 0o600 });
    return key;
  }

  async listTrustedPublicKeys(): Promise<TrustedPackageSigner[]> {
    const key = await this.getActiveSigningKey();
    return [{
      signerId: key.signerId,
      name: "Ascend Nexus Local Package Signer",
      keyId: key.keyId,
      algorithm: "Ed25519",
      publicKeyPem: key.publicKeyPem,
      trustScope: ["artist_export", "release_export", "media_library_export", "mixed_export", "full_content_backup"],
      status: key.status === "active" ? "trusted" : "revoked",
      validFrom: key.createdAt,
      allowedSourceEnvironments: ["development", "test", "staging", "production"],
      createdAt: key.createdAt,
      updatedAt: nowIso(),
      schemaVersion: 1,
    }];
  }

  async rotateKey(): Promise<StoredSigningKey> {
    const existing = await readJson<StoredSigningKey>(signingKeyPath());
    if (existing) await fs.writeFile(path.join(keyRoot(), `${existing.keyId}.revoked.json`), JSON.stringify({ ...existing, status: "revoked" }, null, 2), { mode: 0o600 });
    await fs.rm(signingKeyPath(), { force: true });
    return this.getActiveSigningKey();
  }
}

export const packageSigningKeyProvider = new PackageSigningKeyProvider();

export class ExportPackageSigningService {
  async signPackage(input: { manifest: Buffer; packageMetadata: Buffer; checksumManifest: Buffer; packageId: string; packageVersion: string }) {
    const key = await packageSigningKeyProvider.getActiveSigningKey();
    const metadata: PackageSignatureMetadata = {
      signatureVersion: 1,
      algorithm: "Ed25519",
      keyId: key.keyId,
      signerId: key.signerId,
      signedAt: nowIso(),
      signatureScope: ["manifest.json", "package.json", "checksums.sha256", "packageId", "packageVersion"],
      manifestDigest: sha256(input.manifest),
      packageMetadataDigest: sha256(input.packageMetadata),
      checksumManifestDigest: sha256(input.checksumManifest),
      packageId: input.packageId,
      packageVersion: input.packageVersion,
    };
    const signingInput = Buffer.from(JSON.stringify(metadata));
    const privateKey = crypto.createPrivateKey(key.privateKeyPem);
    const signature = crypto.sign(null, signingInput, privateKey).toString("base64");
    return { metadata, signature, signingInputDigest: sha256(signingInput) };
  }

  async verifySignature(input: { metadata: PackageSignatureMetadata; signature: string }): Promise<{ status: string; valid: boolean; signer?: TrustedPackageSigner; checkedAt: string; errors: string[] }> {
    const trusted = await packageSigningKeyProvider.listTrustedPublicKeys();
    const signer = trusted.find((item) => item.keyId === input.metadata.keyId && item.signerId === input.metadata.signerId);
    if (!signer) return { status: "valid_untrusted", valid: false, checkedAt: nowIso(), errors: ["Signer is not trusted."] };
    if (signer.status === "revoked") return { status: "key_revoked", valid: false, signer, checkedAt: nowIso(), errors: ["Signer key is revoked."] };
    const publicKey = crypto.createPublicKey(signer.publicKeyPem);
    const valid = crypto.verify(null, Buffer.from(JSON.stringify(input.metadata)), publicKey, Buffer.from(input.signature, "base64"));
    return { status: valid ? "valid_trusted" : "invalid", valid, signer, checkedAt: nowIso(), errors: valid ? [] : ["Package signature is invalid."] };
  }

  async getHealth() {
    const key = await packageSigningKeyProvider.getActiveSigningKey();
    return { status: "ready", algorithm: "Ed25519", activeKeyId: key.keyId, privateKeyStorage: "local-managed-private-file" };
  }
}

export const exportPackageSigningService = new ExportPackageSigningService();

export class ExportPackageEncryptionService {
  async getOrCreateServerKey(): Promise<Buffer> {
    await fs.mkdir(keyRoot(), { recursive: true, mode: 0o700 });
    const existing = await readJson<{ keyMaterial: string }>(encryptionKeyPath());
    if (existing?.keyMaterial) return Buffer.from(existing.keyMaterial, "base64");
    const key = crypto.randomBytes(32);
    await fs.writeFile(encryptionKeyPath(), JSON.stringify({ keyId: `pkg-encryption-${Date.now()}`, keyMaterial: key.toString("base64"), createdAt: nowIso() }, null, 2), { mode: 0o600 });
    return key;
  }

  async encryptBuffer(plain: Buffer, mode: "server_managed_key" | "operator_passphrase" | "recipient_public_key" = "server_managed_key") {
    const key = await this.getOrCreateServerKey();
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
    const encryptedPayload = Buffer.concat([cipher.update(plain), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const metadata: PackageEncryptionMetadata = {
      encryptionVersion: 1,
      algorithm: "AES-256-GCM",
      keyWrappingMode: mode,
      keyReference: "local-managed-export-import-key",
      nonce: nonce.toString("base64"),
      authTag: authTag.toString("base64"),
      authenticationTagMode: "detached",
      createdAt: nowIso(),
      metadataVisibility: "safe_operational_metadata",
    };
    const container = Buffer.from(JSON.stringify({ container: "anmexport-encrypted-v1", encryption: metadata, encryptedPayload: encryptedPayload.toString("base64") }, null, 2));
    return { metadata, container };
  }

  async decryptBuffer(container: Buffer): Promise<{ metadata: PackageEncryptionMetadata; plaintext: Buffer }> {
    const parsed = JSON.parse(container.toString("utf8")) as { container: string; encryption: PackageEncryptionMetadata; encryptedPayload: string };
    if (parsed.container !== "anmexport-encrypted-v1") throw new Error("IMPORT_PACKAGE_DECRYPTION_FAILED");
    const key = await this.getOrCreateServerKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.encryption.nonce, "base64"));
    decipher.setAuthTag(Buffer.from(parsed.encryption.authTag, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(parsed.encryptedPayload, "base64")), decipher.final()]);
    return { metadata: parsed.encryption, plaintext };
  }

  async getHealth() {
    await this.getOrCreateServerKey();
    return { status: "ready", algorithm: "AES-256-GCM", keyWrappingMode: "server_managed_key", keyStorage: "local-managed-private-file" };
  }
}

export const exportPackageEncryptionService = new ExportPackageEncryptionService();
