import type { StorageProviderConfig } from "../../models/media";
import { BackendSignedProviderAdapter } from "./BackendSignedProviderAdapter";

export class FirebaseStorageAdapter extends BackendSignedProviderAdapter {
  constructor(config: StorageProviderConfig) {
    super("firebase", config);
  }
}
