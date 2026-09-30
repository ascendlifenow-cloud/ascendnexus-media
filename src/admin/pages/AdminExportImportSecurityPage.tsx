import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminExportImportSecurityApiService } from "../services/AdminExportImportApiService";

export function AdminExportImportSecurityPage() {
  const [data, setData] = useState<Record<string, unknown>>({});
  const refresh = async () => {
    const [capabilities, policy, health, signers] = await Promise.all([
      adminExportImportSecurityApiService.capabilities(),
      adminExportImportSecurityApiService.securityPolicy(),
      adminExportImportSecurityApiService.health(),
      adminExportImportSecurityApiService.trustedSigners(),
    ]);
    setData({ capabilities: capabilities.data, policy: policy.data, health: health.data, trustedSigners: signers.data });
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Export / Import" title="Package Security" status="ready" description="Package Version 2 format, signing, trusted signers, encryption, and import security policy." />
      <div className="flex justify-end">
        <Button variant="glass" onClick={refresh}><ShieldCheck className="h-4 w-4" />Refresh Security State</Button>
      </div>
      <AdminSectionCard title="Security State">
        <pre className="max-h-[34rem] overflow-auto rounded bg-black/30 p-4 text-xs text-white/70">{JSON.stringify(data, null, 2)}</pre>
      </AdminSectionCard>
    </div>
  );
}
