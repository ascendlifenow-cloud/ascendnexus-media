import { Music4 } from "lucide-react";
import { CoverArtFallbackVariant } from "../../utils/coverArtUtils";

interface CoverArtFallbackProps {
  title?: string;
  variant?: CoverArtFallbackVariant;
}

export function CoverArtFallback({ title, variant = "default" }: CoverArtFallbackProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_35%_18%,rgba(86,215,255,.22),transparent_24%),radial-gradient(circle_at_70%_78%,rgba(243,91,185,.2),transparent_27%),linear-gradient(135deg,rgba(9,10,15,.2),rgba(9,10,15,.42))] p-5 text-center"
      role="img"
      aria-label={title ? `${title} fallback cover art` : "Ascend Nexus Media fallback cover art"}
    >
      <div className="grid h-14 w-14 place-items-center rounded-md border border-white/18 bg-black/24 shadow-glow backdrop-blur">
        <Music4 className="h-7 w-7 text-cyanGlow" aria-hidden="true" />
      </div>
      {variant === "default" ? (
        <>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-cyan-100">Ascend Nexus</p>
          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-white/58">Media Release</p>
        </>
      ) : null}
    </div>
  );
}
