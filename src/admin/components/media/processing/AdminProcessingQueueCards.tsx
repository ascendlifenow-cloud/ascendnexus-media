import type { MediaProcessingHealth } from "../../../../models/media";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { formatQueueName } from "../../../utils/mediaProcessingAdminUtils";

export function AdminProcessingQueueCards({
  health,
  onPauseQueue,
  onResumeQueue,
}: {
  health?: MediaProcessingHealth;
  onPauseQueue?: (queueName: string) => void;
  onResumeQueue?: (queueName: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      {(health?.queueCounts ?? []).map((queue) => (
        <Card key={queue.queueName} className="p-4">
          <p className="text-xs uppercase text-white/45">{queue.paused ? "Paused" : "Queue"}</p>
          <h3 className="mt-2 text-sm font-semibold text-white">{formatQueueName(queue.queueName)}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/65">
            <span>Queued {queue.queued}</span>
            <span>Active {queue.active}</span>
            <span>Done {queue.completed}</span>
            <span>Failed {queue.failed + queue.deadLetter}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" disabled>View Queue</Button>
            {queue.paused ? (
              <Button type="button" variant="glass" size="sm" onClick={() => onResumeQueue?.(queue.queueName)}>Resume</Button>
            ) : (
              <Button type="button" variant="glass" size="sm" onClick={() => onPauseQueue?.(queue.queueName)}>Pause</Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
