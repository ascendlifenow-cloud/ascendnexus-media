import type { AdminMetadataRecord } from "../../../models/admin";
import { AdminMetadataTableRow } from "./AdminMetadataTableRow";

interface AdminMetadataTableProps {
  records: readonly AdminMetadataRecord[];
  onViewRecord: (record: AdminMetadataRecord) => void;
}

export function AdminMetadataTable({ records, onViewRecord }: AdminMetadataTableProps) {
  return (
    <section className="overflow-hidden rounded-anm-panel border border-white/10 bg-anm-surface-glass shadow-anm-card-glow" aria-labelledby="admin-metadata-table-heading">
      <div className="border-b border-white/10 px-4 py-4">
        <h2 id="admin-metadata-table-heading" className="text-xl font-semibold text-white">Metadata Records</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[104rem] border-collapse text-left">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-white/44">
            <tr>
              <th scope="col" className="px-4 py-3">Entity</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">SEO Title</th>
              <th scope="col" className="px-4 py-3">Description</th>
              <th scope="col" className="px-4 py-3">Social Image</th>
              <th scope="col" className="px-4 py-3">No-Index</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <AdminMetadataTableRow key={record.metadataRecordId} record={record} onView={onViewRecord} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
