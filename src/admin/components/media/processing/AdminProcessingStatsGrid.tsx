import { Activity, AlertTriangle, Boxes, ListChecks, RadioTower, ServerCog, ShieldAlert, Wifi } from "lucide-react";

interface Props {
  stats: {
    overallStatus: string;
    redisConnection: string;
    activeWorkers: number;
    activeJobs: number;
    queuedJobs: number;
    failedJobs: number;
    deadLetterJobs: number;
    processingAssets: number;
  };
}

const items = [
  ["Overall Status", "overallStatus", ShieldAlert],
  ["Redis Connection", "redisConnection", Wifi],
  ["Active Workers", "activeWorkers", RadioTower],
  ["Active Jobs", "activeJobs", Activity],
  ["Queued Jobs", "queuedJobs", ListChecks],
  ["Failed Jobs", "failedJobs", AlertTriangle],
  ["Dead Letter", "deadLetterJobs", ServerCog],
  ["Processing Assets", "processingAssets", Boxes],
] as const;

export function AdminProcessingStatsGrid({ stats }: Props) {
  return (
    <section className="flex flex-wrap items-center gap-2" aria-label="Media processing summary">
      {items.map(([label, key, Icon]) => (
        <span
          key={key}
          title={label}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
        >
          <Icon className="h-4 w-4 text-anm-gold" aria-hidden />
          <span aria-hidden>{stats[key]}</span>
          <span className="sr-only">{label}: {stats[key]}</span>
        </span>
      ))}
    </section>
  );
}
