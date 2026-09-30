import { create } from "zustand";

interface AudioPreviewState {
  activeReleaseId?: string;
  setActiveReleaseId: (releaseId: string) => void;
  clearActiveReleaseId: (releaseId?: string) => void;
}

export const useAudioPreviewStore = create<AudioPreviewState>((set, get) => ({
  activeReleaseId: undefined,
  setActiveReleaseId: (releaseId) => set({ activeReleaseId: releaseId }),
  clearActiveReleaseId: (releaseId) => {
    if (!releaseId || get().activeReleaseId === releaseId) {
      set({ activeReleaseId: undefined });
    }
  },
}));
