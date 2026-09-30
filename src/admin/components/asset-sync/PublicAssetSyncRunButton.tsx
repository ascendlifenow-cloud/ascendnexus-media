import { RefreshCcw } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface PublicAssetSyncRunButtonProps {
  isRunning: boolean;
  onRun: () => void;
}

export function PublicAssetSyncRunButton({ isRunning, onRun }: PublicAssetSyncRunButtonProps) {
  return (
    <Button type="button" variant="primary" onClick={onRun} disabled={isRunning} isLoading={isRunning}>
      <RefreshCcw className="h-4 w-4" aria-hidden />
      Run Asset Sync
    </Button>
  );
}

