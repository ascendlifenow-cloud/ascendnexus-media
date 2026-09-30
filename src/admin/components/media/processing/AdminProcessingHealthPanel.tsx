import type { MediaProcessingHealth } from "../../../../models/media";
import { AdminSectionCard } from "../../AdminSectionCard";

export function AdminProcessingHealthPanel({ health }: { health?: MediaProcessingHealth }) {
  return (
    <AdminSectionCard title="Processing Health" description="Queue and worker readiness for media background processing.">
      <div className="grid gap-3 text-sm text-white/70 md:grid-cols-4">
        <div>Workers: <span className="text-white">{health?.workersEnabled ? "Enabled" : "Disabled"}</span></div>
        <div>Redis: <span className="text-white">{health?.redisConnected ? "Connected" : "Fallback"}</span></div>
        <div>Image Tool: <span className="text-white">{health?.imageProcessorAvailable ? "Available" : "Readiness"}</span></div>
        <div>FFmpeg: <span className="text-white">{health?.ffmpegAvailable ? "Available" : "Readiness"}</span></div>
      </div>
      {health?.warnings?.length ? (
        <div className="mt-4 grid gap-2 text-xs text-amber-200">
          {health.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
    </AdminSectionCard>
  );
}
