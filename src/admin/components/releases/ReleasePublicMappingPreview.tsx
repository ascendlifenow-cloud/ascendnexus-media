import type { PublicSongRelease } from "../../../models/release";

interface ReleasePublicMappingPreviewProps {
  publicRelease: PublicSongRelease | null;
}

export function ReleasePublicMappingPreview({ publicRelease }: ReleasePublicMappingPreviewProps) {
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-3">
      <p className="text-sm font-semibold text-white">Public Mapping Preview</p>
      <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/58">
        {publicRelease ? JSON.stringify(publicRelease, null, 2) : "Public release mapping is blocked until readiness issues are resolved."}
      </pre>
    </div>
  );
}

