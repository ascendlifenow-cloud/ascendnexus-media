import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { protectedDownloadUrl, protectedMediaApiService } from "../../services/ProtectedMediaApiService";
import { authShellChangedEvent } from "../../../services/auth/AuthenticationShellService";
import { ActionTooltip } from "../../../components/ui/ActionTooltip";

export function ProtectedDownloadButton({ releaseSlug }: { releaseSlug: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const operation = useRef(0);
  const controller = useRef<AbortController | undefined>(undefined);
  const [sessionChanged, setSessionChanged] = useState(false);

  useEffect(() => {
    const cancel = () => { operation.current++; controller.current?.abort(); inFlight.current = false; setPending(false); setError(""); setSessionChanged(true); };
    const storage = (event: StorageEvent) => { if (event.key === authShellChangedEvent) cancel(); };
    setSessionChanged(false);
    window.addEventListener(authShellChangedEvent, cancel);
    window.addEventListener("storage", storage);
    return () => { operation.current++; controller.current?.abort(); inFlight.current = false; window.removeEventListener(authShellChangedEvent, cancel); window.removeEventListener("storage", storage); };
  }, [releaseSlug]);

  const authorize = async () => {
    if (inFlight.current || sessionChanged) return;
    inFlight.current = true;
    const requestId = ++operation.current;
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    setPending(true);
    setError("");
    try {
      const authorization = await protectedMediaApiService.authorizeReleaseDownload(releaseSlug, request.signal);
      if (requestId !== operation.current) return;
      if (!authorization.authorized || !authorization.downloadEndpoint) throw new Error("Download is not available.");
      if (!authorization.expiresAt || !Number.isFinite(Date.parse(authorization.expiresAt)) || Date.parse(authorization.expiresAt) <= Date.now()) throw new Error("Download authorization expired. Please try again.");
      window.location.assign(protectedDownloadUrl(authorization.downloadEndpoint));
    } catch (err) {
      if (requestId === operation.current) setError(request.signal.aborted ? "Download request timed out. Please try again." : err instanceof Error ? err.message : "Download denied.");
    } finally {
      clearTimeout(timeout);
      if (requestId === operation.current) { inFlight.current = false; setPending(false); }
    }
  };

  return (
    <div>
      <button className="group/action relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/85 text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" type="button" onClick={authorize} disabled={pending || sessionChanged} aria-busy={pending} aria-label={pending ? "Authorizing download" : "Download song"}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        <ActionTooltip label={pending ? "Authorizing download" : "Download song"} />
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-rose-100">{error}</p> : null}
    </div>
  );
}
