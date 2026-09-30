import { Pause, Play } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { AdminSectionCard } from "../../AdminSectionCard";

interface Props {
  queues: Array<{ queueName: string; paused: boolean; queued: number }>;
  onPause: (queueName: string) => void;
  onResume: (queueName: string) => void;
}

export function AdminQueueControlPanel({ queues, onPause, onResume }: Props) {
  return (
    <AdminSectionCard title="Queue Controls" description="Pause or resume one explicit queue. Active jobs may continue.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {queues.map((queue) => (
          <div key={queue.queueName} className="rounded-md border border-white/10 bg-black/18 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{queue.queueName}</p>
                <p className="text-xs text-white/50">{queue.queued} waiting • {queue.paused ? "Paused" : "Running"}</p>
              </div>
              {queue.paused ? (
                <Button type="button" variant="glass" size="sm" onClick={() => onResume(queue.queueName)}>
                  <Play className="h-4 w-4" aria-hidden />
                  Resume
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => onPause(queue.queueName)}>
                  <Pause className="h-4 w-4" aria-hidden />
                  Pause
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminSectionCard>
  );
}
