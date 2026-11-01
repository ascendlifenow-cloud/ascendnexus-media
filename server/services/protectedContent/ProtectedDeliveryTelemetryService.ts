export type DeliveryStage = "authorization" | "storage_read" | "usage_commit" | "byte_delivery";
type Action = "stream" | "download";
interface Observation {
  action: Action;
  method: "GET" | "HEAD";
  stage: DeliveryStage;
  startedAt: number;
  endedAt?: number;
  status?: number;
  code?: string;
  bytesCompleted: boolean;
}

const stages = new Set<DeliveryStage>(["authorization", "storage_read", "usage_commit", "byte_delivery"]);
const windowMs = 15 * 60 * 1000;
const capacity = 100;

export class ProtectedDeliveryTelemetryService {
  private readonly observations = new Map<number, Observation>();
  private sequence = 0;

  constructor(private readonly clock: () => number = Date.now) {}

  private prune(now: number) {
    for (const [id, item] of this.observations) if (now - item.startedAt >= windowMs) this.observations.delete(id);
    while (this.observations.size > capacity) this.observations.delete(this.observations.keys().next().value!);
  }

  begin(action: Action, method: string | undefined) {
    const now = this.clock();
    const id = ++this.sequence;
    this.observations.set(id, { action, method: method === "HEAD" ? "HEAD" : "GET", stage: "authorization", startedAt: now, bytesCompleted: false });
    this.prune(now);
    return id;
  }

  advance(id: number, stage: DeliveryStage) {
    const item = this.observations.get(id);
    if (item && item.endedAt === undefined && stages.has(stage)) item.stage = stage;
  }

  finish(id: number, status: number, bytesCompleted: boolean, code?: string) {
    const item = this.observations.get(id);
    if (!item || item.endedAt !== undefined) return;
    item.endedAt = this.clock();
    item.status = Number.isInteger(status) && status >= 100 && status <= 599 ? status : 503;
    item.bytesCompleted = bytesCompleted && item.method === "GET" && [200, 206].includes(item.status);
    item.code = code && /^(PROTECTED_|SONG_|MEMBER_)[A-Z0-9_]{1,70}$/.test(code) ? code : undefined;
    this.prune(item.endedAt);
  }

  getSnapshot() {
    const now = this.clock();
    this.prune(now);
    const items = [...this.observations.values()];
    const failures = items.filter(item => (item.status ?? 0) >= 500);
    const active = items.filter(item => item.endedAt === undefined);
    const lastFailure = failures.sort((a, b) => b.endedAt! - a.endedAt!)[0];
    const completed = items.filter(item => item.bytesCompleted);
    const lastCompletion = completed.sort((a, b) => b.endedAt! - a.endedAt!)[0];
    return {
      scope: "single_process_origin_observations",
      retentionSeconds: windowMs / 1000,
      maximumObservations: capacity,
      observedRequests: items.length,
      activeRequests: active.length,
      stalledRequests: active.filter(item => now - item.startedAt >= 120000).length,
      originByteResponsesCompleted: completed.length,
      originRangeResponsesCompleted: completed.filter(item => item.status === 206 && item.action === "stream").length,
      originDownloadsCompleted: completed.filter(item => item.action === "download").length,
      serverFailures: failures.length,
      deniedRequests: items.filter(item => [401, 403, 404, 416].includes(item.status ?? 0)).length,
      clientDisconnects: items.filter(item => item.status === 499).length,
      lastOriginCompletionAt: lastCompletion ? new Date(lastCompletion.endedAt!).toISOString() : null,
      lastFailure: lastFailure ? { action: lastFailure.action, method: lastFailure.method, stage: lastFailure.stage,
        status: lastFailure.status, code: lastFailure.code ?? "PROTECTED_CONTENT_UNAVAILABLE", occurredAt: new Date(lastFailure.endedAt!).toISOString() } : null,
      endToEndVerified: false,
    };
  }
}

export const protectedDeliveryTelemetryService = new ProtectedDeliveryTelemetryService();
