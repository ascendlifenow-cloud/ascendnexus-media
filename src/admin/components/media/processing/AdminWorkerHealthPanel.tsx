import { Card } from "../../../../components/ui/Card";
import type { MediaProcessingHealth, WorkerHealth } from "../../../../models/media/MediaProcessingJob";

const WorkerCard = ({ title, worker, details }: { title: string; worker?: WorkerHealth; details?: string[] }) => (
  <Card className="p-4">
    <p className="text-xs uppercase tracking-[0.16em] text-white/45">{title}</p>
    <h3 className="mt-2 text-lg font-semibold text-white">{worker?.running ? "Running" : "Stopped"}</h3>
    <dl className="mt-3 grid gap-2 text-sm text-white/65">
      <div className="flex justify-between gap-3"><dt>Concurrency</dt><dd className="text-white">{worker?.concurrency ?? 0}</dd></div>
      <div className="flex justify-between gap-3"><dt>Failed Jobs</dt><dd className="text-white">{worker?.failedJobCount ?? 0}</dd></div>
      <div className="flex justify-between gap-3"><dt>Last Job</dt><dd className="text-white">{worker?.lastJobAt ?? "None"}</dd></div>
    </dl>
    {details?.length ? <div className="mt-3 grid gap-1 text-xs text-white/52">{details.map((item) => <p key={item}>{item}</p>)}</div> : null}
    <p className="mt-3 text-xs text-white/45">{worker?.message ?? "Worker health is pending."}</p>
  </Card>
);

export function AdminWorkerHealthPanel({ health }: { health?: MediaProcessingHealth }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <WorkerCard title="Image Worker" worker={health?.imageWorker} details={[`Image library: ${health?.imageProcessorAvailable ? "available" : "readiness"}`, "Derivative processing ready"]} />
      <WorkerCard title="Audio Worker" worker={health?.audioWorker} details={[`FFmpeg: ${health?.ffmpegAvailable ? "available" : "readiness"}`, `FFprobe: ${health?.ffprobeAvailable ? "available" : "readiness"}`, "Waveform processing ready"]} />
      <WorkerCard title="Storage Worker" worker={health?.storageWorker} details={["Provider health via backend", "Public/private operations ready"]} />
      <WorkerCard title="CDN Worker" worker={health?.cdnWorker} details={["Invalidation provider readiness", "Optional failure policy"]} />
      <WorkerCard title="Publication Worker" worker={health?.publicationWorker} details={["Private-to-public promotion", "Sync verification ready"]} />
    </div>
  );
}
