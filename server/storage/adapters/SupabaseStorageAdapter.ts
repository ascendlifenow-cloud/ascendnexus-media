import { LocalStorageAdapter } from "./LocalStorageAdapter";

export class SupabaseStorageAdapter extends LocalStorageAdapter {
  getProviderName(): string {
    return "supabase";
  }

  isConfigured(): boolean {
    return false;
  }
}
