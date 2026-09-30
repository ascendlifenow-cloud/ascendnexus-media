import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import { AdminReleaseTableRow } from "./AdminReleaseTableRow";

interface AdminReleaseTableProps {
  releases: readonly SongReleaseAdminRecord[];
  artists: readonly ArtistAdminRecord[];
  selectedReleaseId?: string;
  onSelectRelease: (release: SongReleaseAdminRecord) => void;
  onOpenReleaseDetails: (release: SongReleaseAdminRecord) => void;
  onReleaseUpdated?: (release: SongReleaseAdminRecord) => void;
  onReleaseDeleted?: (releaseId: string) => void;
}

export function AdminReleaseTable({
  releases,
  artists,
  selectedReleaseId,
  onSelectRelease,
  onOpenReleaseDetails,
  onReleaseUpdated,
  onReleaseDeleted,
}: AdminReleaseTableProps) {
  const findArtist = (artistId: string) => artists.find((artist) => artist.artistId === artistId) ?? null;

  return (
    <section className="overflow-hidden rounded-md border border-white/[0.07] bg-white/[0.025] shadow-[0_12px_32px_rgba(0,0,0,0.14)]" aria-labelledby="admin-releases-table-heading">
      <div className="border-b border-white/[0.07] bg-white/[0.04] px-4 py-4">
        <h2 id="admin-releases-table-heading" className="text-xl font-semibold text-white">
          Release Records
        </h2>
        <p className="mt-1 text-sm text-white/52">Click once to select a release. Double-click to open details.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[86rem] border-separate border-spacing-y-2 px-2 py-2 text-left">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-white/44">
            <tr>
              <th scope="col" className="px-4 py-3">Release</th>
              <th scope="col" className="px-4 py-3">Artist</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Featured</th>
              <th scope="col" className="px-4 py-3">Genre</th>
              <th scope="col" className="px-4 py-3">Release Date</th>
              <th scope="col" className="px-4 py-3">Updated</th>
              <th scope="col" className="px-4 py-3">Public Link</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((release) => (
              <AdminReleaseTableRow
                key={release.releaseId}
                release={release}
                artist={findArtist(release.artistId)}
                selected={release.releaseId === selectedReleaseId}
                onSelect={onSelectRelease}
                onOpenDetails={onOpenReleaseDetails}
                onReleaseUpdated={onReleaseUpdated}
                onReleaseDeleted={onReleaseDeleted}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
