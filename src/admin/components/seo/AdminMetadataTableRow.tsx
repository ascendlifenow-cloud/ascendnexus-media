import type { AdminMetadataRecord } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { AdminMetadataActions } from "./AdminMetadataActions";
import { AdminMetadataStatusBadge } from "./AdminMetadataStatusBadge";
import { AdminNoIndexBadge } from "./AdminNoIndexBadge";
import { formatMetadataEntityType } from "../../utils/adminMetadataUtils";

interface AdminMetadataTableRowProps {
  record: AdminMetadataRecord;
  onView: (record: AdminMetadataRecord) => void;
}

export function AdminMetadataTableRow({ record, onView }: AdminMetadataTableRowProps) {
  return (
    <tr className="border-t border-white/10 align-top">
      <td className="min-w-72 px-4 py-4">
        <p className="font-semibold text-white">{record.entityLabel}</p>
        <p className="mt-1 text-sm text-white/52">{record.publicPath || "Missing public path"}</p>
        <p className="mt-1 text-xs text-white/36">{record.entityId || record.metadataRecordId}</p>
      </td>
      <td className="px-4 py-4 text-sm text-white/64">{formatMetadataEntityType(record.entityType)}</td>
      <td className="min-w-64 px-4 py-4 text-sm text-white/70">
        <p className="line-clamp-2">{record.seoMetadata?.title || "Missing title"}</p>
      </td>
      <td className="min-w-72 px-4 py-4 text-sm text-white/58">
        <p className="line-clamp-3">{record.seoMetadata?.description || "Missing description"}</p>
      </td>
      <td className="px-4 py-4 text-sm font-semibold">
        {record.socialMetadata?.imageUrl || record.seoMetadata?.imageUrl ? (
          <span className="text-anm-success">Present</span>
        ) : (
          <span className="text-white/42">Missing</span>
        )}
      </td>
      <td className="px-4 py-4">
        <AdminNoIndexBadge noIndex={record.noIndex} />
      </td>
      <td className="min-w-44 px-4 py-4">
        <div className="flex flex-col gap-2">
          <AdminMetadataStatusBadge status={record.status} />
          {record.missingFields.length ? (
            <Badge variant="neutral" className="w-fit text-white/58">
              {record.missingFields.length} missing
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="min-w-[22rem] px-4 py-4">
        <AdminMetadataActions record={record} onView={onView} />
      </td>
    </tr>
  );
}
