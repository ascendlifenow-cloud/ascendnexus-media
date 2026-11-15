import { useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { protectedDownloadUrl, protectedMediaApiService } from "../../services/ProtectedMediaApiService";

export function ProtectedDownloadButton({ mediaId }: { mediaId: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const authorize = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const authorization = await protectedMediaApiService.authorizeDownload(mediaId);
      if (!authorization.authorized || !authorization.downloadEndpoint) throw new Error("Download is not available.");
      window.location.assign(protectedDownloadUrl(authorization.downloadEndpoint));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download denied.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <div>
      <button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" onClick={authorize} disabled={pending} aria-busy={pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Authorizing..." : "Download"}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-rose-100">{error}</p> : null}
    </div>
  );
}
