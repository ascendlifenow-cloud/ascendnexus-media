import type { StorageProviderConfig } from "../../models/media";
import { BackendSignedProviderAdapter } from "./BackendSignedProviderAdapter";

export class SupabaseStorageAdapter extends BackendSignedProviderAdapter {
  constructor(config: StorageProviderConfig) {
    super("supabase", config);
  }
}
