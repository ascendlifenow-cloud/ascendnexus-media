import { Button } from "../../../components/ui/Button";
import type { MediaPublicationOperation } from "../../../models/publication";

export function MediaPublicationRollbackButton({ operation, onRollback }: { operation?: MediaPublicationOperation; onRollback: () => void }) {
  const canRollback = Boolean(operation && ["completed", "completed_with_warnings", "failed", "blocked"].includes(operation.status) && operation.promotedAssetIds.length);
  return (
    <Button type="button" variant="danger" size="sm" disabled={!canRollback} onClick={onRollback}>
      Rollback
    </Button>
  );
}
