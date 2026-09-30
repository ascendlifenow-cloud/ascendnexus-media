import { ExternalLink, Eye, RotateCcw, Save, ShieldAlert, X } from "lucide-react";
import type { AdminMetadataRecord } from "../../../../models/admin";
import { Button } from "../../../../components/ui/Button";
import { LinkButton } from "../../../../components/ui/LinkButton";
import { isMetadataRecordPublicSafe } from "../../../utils/adminMetadataFormUtils";

interface Props {
  record: AdminMetadataRecord;
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
  onSaveNoIndex: () => void;
  onCancel: () => void;
}

export function AdminMetadataFormActions({ record, isSaving, isDirty, onSave, onSaveNoIndex, onCancel }: Props) {
  const publicSafe = isMetadataRecordPublicSafe(record);
  return (
    <div className="sticky bottom-4 z-10 rounded-anm-panel border border-white/10 bg-anm-surface/95 p-4 shadow-anm-card-glow backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="primary" onClick={onSave} disabled={isSaving} isLoading={isSaving}>
          <Save className="h-4 w-4" aria-hidden />
          Save Metadata
        </Button>
        <Button type="button" variant="glass" onClick={onSaveNoIndex} disabled={isSaving} isLoading={isSaving}>
          <ShieldAlert className="h-4 w-4" aria-hidden />
          Save as No-Index
        </Button>
        <Button type="button" variant="glass" disabled>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset to Generated Defaults
        </Button>
        <LinkButton to={`/admin/preview/metadata/${record.metadataRecordId}`} variant="glass">
          <Eye className="h-4 w-4" aria-hidden />
          Preview Metadata
        </LinkButton>
        {publicSafe && record.publicPath ? (
          <LinkButton to={record.publicPath} variant="glass">
            <ExternalLink className="h-4 w-4" aria-hidden />
            Open Public Page
          </LinkButton>
        ) : (
          <Button type="button" variant="disabled" disabled>Open Public Page</Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden />
          Cancel
        </Button>
        {isDirty ? <span className="ml-auto text-sm font-semibold text-anm-gold">Unsaved changes</span> : null}
      </div>
    </div>
  );
}
