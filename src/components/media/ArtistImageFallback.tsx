import { Sparkles } from "lucide-react";
import type { ArtistImageFallbackVariant } from "../../utils/artistImageUtils";

interface ArtistImageFallbackProps {
  artistName?: string;
  variant?: ArtistImageFallbackVariant;
}

export function ArtistImageFallback({ artistName, variant = "default" }: ArtistImageFallbackProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_35%_18%,rgba(86,215,255,.2),transparent_24%),radial-gradient(circle_at_72%_78%,rgba(243,91,185,.22),transparent_28%),linear-gradient(135deg,rgba(9,10,15,.12),rgba(9,10,15,.46))] p-5 text-center"
      role="img"
      aria-label={artistName ? `${artistName} fallback artist portrait` : "Ascend Nexus Media fallback artist portrait"}
    >
      <div className="grid h-14 w-14 place-items-center rounded-md border border-white/18 bg-black/24 shadow-glow backdrop-blur">
        <Sparkles className="h-7 w-7 text-cyanGlow" aria-hidden="true" />
      </div>
      {variant === "default" ? (
        <>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-cyan-100">AI Persona</p>
          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-white/58">Artist</p>
        </>
      ) : null}
    </div>
  );
}
