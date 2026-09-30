import type { StorageProviderConfig, StorageProviderName } from "../../models/media";
import { CustomApiStorageAdapter } from "./CustomApiStorageAdapter";

export class BackendSignedProviderAdapter extends CustomApiStorageAdapter {
  constructor(
    private readonly providerName: Extract<StorageProviderName, "s3" | "r2" | "supabase" | "firebase">,
    config: StorageProviderConfig,
  ) {
    super({ ...config, provider: "custom" });
  }

  getProviderName() {
    return this.providerName;
  }

  async getHealthStatus() {
    const base = await super.getHealthStatus();
    return {
      ...base,
      provider: this.providerName,
      message: `${this.providerName.toUpperCase()} adapter is ready for backend signed upload workflow. No frontend secrets are used.`,
      metadata: {
        ...(base.metadata ?? {}),
        backendSignedUploadRequired: true,
      },
    };
  }
}
