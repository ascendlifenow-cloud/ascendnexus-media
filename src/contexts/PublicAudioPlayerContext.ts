import { createContext } from "react";
import type { PublicAudioPlayerContextValue } from "../state/audio/audioPlayerTypes";

export const PublicAudioPlayerContext = createContext<PublicAudioPlayerContextValue | null>(null);

