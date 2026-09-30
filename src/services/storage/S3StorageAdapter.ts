import type { StorageProviderConfig } from "../../models/media";
import { BackendSignedProviderAdapter } from "./BackendSignedProviderAdapter";

export class S3StorageAdapter extends BackendSignedProviderAdapter {
  constructor(config: StorageProviderConfig) {
    super("s3", config);
  }
}
