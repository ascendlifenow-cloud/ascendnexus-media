import { Eye, ExternalLink, MoreHorizontal, Pencil } from "lucide-react";
import type { AdminMetadataRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";

interface AdminMetadataActionsProps {
  record: AdminMetadataRecord;
  onView: (record: AdminMetadataRecord) => void;
}

export function AdminMetadataActions({ record, onView }: AdminMetadataActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="glass" size="sm" onClick={() => onView(record)} aria-label={`View metadata for ${record.entityLabel}`}>
        <Eye className="h-4 w-4" aria-hidden />
        View
      </Button>
      <LinkButton to={`/admin/seo/${record.metadataRecordId}/edit`} variant="glass" size="sm" aria-label={`Edit metadata for ${record.entityLabel}`}>
        <Pencil className="h-4 w-4" aria-hidden />
        Edit
      </LinkButton>
      {record.publicPath && !record.noIndex ? (
        <LinkButton to={record.publicPath} variant="glass" size="sm" aria-label={`Open public page for ${record.entityLabel}`}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Public
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" size="sm" disabled>
          Not Public
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon" disabled aria-label={`More actions for ${record.entityLabel}`}>
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
