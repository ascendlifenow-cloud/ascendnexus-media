import { LocalStorageAdapter } from "./LocalStorageAdapter";

export class FirebaseStorageAdapter extends LocalStorageAdapter {
  getProviderName(): string {
    return "firebase";
  }

  isConfigured(): boolean {
    return false;
  }
}
