import { createContext } from "react";
import type { PublicAudioPlayerContextValue as BasePlayerContextValue, PublicAudioPreviewContract, PublicAudioReleaseSummary } from "../state/audio/audioPlayerTypes";

export interface PublicAudioPlayerContextValue extends BasePlayerContextValue {
  playbackMode: "preview" | "full";
  protectedUsage?: { releaseId: string; streamStarts: number; remainingFullPlays: number | null };
  playQueued: (preview: PublicAudioPreviewContract, release: PublicAudioReleaseSummary) => Promise<void>;
}

export const PublicAudioPlayerContext = createContext<PublicAudioPlayerContextValue | null>(null);
