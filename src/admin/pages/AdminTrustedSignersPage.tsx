import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminImportApiService } from "../services/AdminExportImportApiService";

export function AdminTrustedSignersPage() {
  const [signers, setSigners] = useState<Record<string, unknown>[]>([]);
  const refresh = async () => setSigners((await adminImportApiService.trustedSigners()).data ?? []);
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Import Trust" title="Trusted Package Signers" status="ready" description="Manage the public verification keys allowed to sign importable export packages." />
      <div className="flex justify-end">
        <Button variant="glass" onClick={refresh}><KeyRound className="h-4 w-4" />Refresh Signers</Button>
      </div>
      <AdminSectionCard title="Trusted Signers">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm text-white/75">
            <thead className="text-xs uppercase text-white/45"><tr><th className="p-3">Signer</th><th className="p-3">Key</th><th className="p-3">Status</th><th className="p-3">Scope</th></tr></thead>
            <tbody>
              {signers.map((signer) => (
                <tr key={String(signer.signerId)} className="border-t border-white/10">
                  <td className="p-3">{String(signer.name ?? signer.signerId)}</td>
                  <td className="p-3 font-mono text-xs">{String(signer.keyId)}</td>
                  <td className="p-3">{String(signer.status)}</td>
                  <td className="p-3">{Array.isArray(signer.trustScope) ? signer.trustScope.join(", ") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSectionCard>
    </div>
  );
}
