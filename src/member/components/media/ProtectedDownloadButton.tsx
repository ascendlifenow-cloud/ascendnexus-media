import { useState } from "react";
import { protectedMediaApiService } from "../../services/ProtectedMediaApiService";

export function ProtectedDownloadButton({ mediaId }: { mediaId: string }) {
  const [error, setError] = useState("");

  const authorize = async () => {
    setError("");
    try {
      const authorization = await protectedMediaApiService.authorizeDownload(mediaId);
      if (!authorization.downloadEndpoint) throw new Error("Download is not available.");
      window.location.assign(authorization.downloadEndpoint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download denied.");
    }
  };

  return (
    <div>
      <button className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={authorize}>Authorize download</button>
      {error ? <p className="mt-2 text-sm text-rose-100">{error}</p> : null}
    </div>
  );
}
