import { ExternalLink } from "lucide-react";
import type { AdminMetadataRecord } from "../../../../models/admin";
import { Button } from "../../../../components/ui/Button";
import { LinkButton } from "../../../../components/ui/LinkButton";
import { formatMetadataEntityType } from "../../../utils/adminMetadataUtils";
import { isMetadataRecordPublicSafe } from "../../../utils/adminMetadataFormUtils";
import { FormSection } from "./AdminMetadataFormControls";

export function AdminMetadataEntityContext({ record }: { record: AdminMetadataRecord }) {
  const publicSafe = isMetadataRecordPublicSafe(record);

  return (
    <FormSection title="Entity Context" description="Entity relationship is read-only in this metadata editor.">
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Entity</dt>
          <dd className="mt-1 text-white/76">{record.entityLabel}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Type</dt>
          <dd className="mt-1 text-white/76">{formatMetadataEntityType(record.entityType)}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Entity ID</dt>
          <dd className="mt-1 break-all text-white/76">{record.entityId || "Missing"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Record ID</dt>
          <dd className="mt-1 break-all text-white/76">{record.metadataRecordId}</dd>
        </div>
      </dl>
      <div className="rounded-md border border-white/10 bg-black/18 p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Public Status</p>
        <p className={publicSafe ? "mt-1 font-semibold text-anm-success" : "mt-1 font-semibold text-anm-warning"}>
          {publicSafe ? "Public" : record.status === "draft" ? "Draft" : record.status === "archived" ? "Archived" : record.publicPath ? "Not Public" : "No Public Path"}
        </p>
      </div>
      {publicSafe && record.publicPath ? (
        <LinkButton to={record.publicPath} variant="glass">
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open Public Page
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" disabled>
          Public page unavailable
        </Button>
      )}
    </FormSection>
  );
}
