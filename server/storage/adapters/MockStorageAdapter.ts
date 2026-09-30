import { LocalStorageAdapter } from "./LocalStorageAdapter";

export class MockStorageAdapter extends LocalStorageAdapter {
  getProviderName(): string {
    return "mock";
  }
}
