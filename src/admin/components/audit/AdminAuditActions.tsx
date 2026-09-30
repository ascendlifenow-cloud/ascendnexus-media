import { Download, RefreshCcw } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function AdminAuditActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="glass" disabled>
        <Download className="h-4 w-4" aria-hidden />
        Export Audit Log
      </Button>
      <Button type="button" variant="glass" disabled>
        <RefreshCcw className="h-4 w-4" aria-hidden />
        Refresh
      </Button>
    </div>
  );
}
