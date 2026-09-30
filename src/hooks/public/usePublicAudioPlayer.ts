import { useContext } from "react";
import { PublicAudioPlayerContext } from "../../contexts/PublicAudioPlayerContext";

export const usePublicAudioPlayer = () => {
  const context = useContext(PublicAudioPlayerContext);
  if (!context) throw new Error("usePublicAudioPlayer must be used within PublicAudioPlayerProvider.");
  return context;
};

