import type { StorageProviderConfig } from "../../models/media";
import { BackendSignedProviderAdapter } from "./BackendSignedProviderAdapter";

export class CloudflareR2StorageAdapter extends BackendSignedProviderAdapter {
  constructor(config: StorageProviderConfig) {
    super("r2", config);
  }
}
