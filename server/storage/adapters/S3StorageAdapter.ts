import { S3CompatibleStorageAdapter } from "../S3CompatibleStorageAdapter";

export class S3StorageAdapter extends S3CompatibleStorageAdapter {
  constructor() {
    super({ providerName: "s3" });
  }
}
