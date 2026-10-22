import { useRef, useState } from "react";
import { protectedMediaApiService } from "../../services/ProtectedMediaApiService";

export function MemberProtectedAudioPlayer({ mediaId, releaseSlug, title }: { mediaId?: string; releaseSlug?: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const start = async () => {
    setError("");
    setStatus("authorizing");
    try {
      const authorization = releaseSlug
        ? await protectedMediaApiService.authorizeReleaseStream(releaseSlug, { component: "member_protected_audio_player" })
        : await protectedMediaApiService.authorizeStream(mediaId ?? "", { component: "member_protected_audio_player" });
      if (!authorization.streamEndpoint) throw new Error("No protected stream endpoint returned.");
      setSource(authorization.streamEndpoint);
      setStatus("ready");
      setTimeout(() => void audioRef.current?.play().catch(() => setStatus("ready")), 0);
    } catch (err) {
      setSource("");
      setStatus("denied");
      setError(err instanceof Error ? err.message : "Protected stream unavailable.");
    }
  };

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-white/50">{status === "idle" ? "Members can request a full play. Free accounts include one full play per song." : status}</p>
        </div>
        <button className="rounded-md border border-cyanGlow/40 px-3 py-2 text-sm font-semibold text-cyanGlow" onClick={start} type="button">
          Play full song
        </button>
      </div>
      {source ? <audio ref={audioRef} className="mt-4 w-full" controls preload="none" src={source} onEnded={() => setSource("")} /> : null}
      {error ? <p className="mt-3 text-sm text-rose-100">{error}</p> : null}
    </div>
  );
}
