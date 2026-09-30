import { S3CompatibleStorageAdapter } from "../S3CompatibleStorageAdapter";

export class CloudflareR2StorageAdapter extends S3CompatibleStorageAdapter {
  constructor() {
    super({ providerName: "r2" });
  }
}
