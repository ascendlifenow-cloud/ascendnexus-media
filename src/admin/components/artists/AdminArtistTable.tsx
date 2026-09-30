import type { ArtistAdminRecord } from "../../../models/admin";
import { AdminArtistTableRow } from "./AdminArtistTableRow";

interface AdminArtistTableProps {
  artists: readonly ArtistAdminRecord[];
  title?: string;
  description?: string;
  emptyMessage?: string;
  selectedArtistId?: string;
  onSelectArtist: (artist: ArtistAdminRecord) => void;
  onOpenArtistDetails: (artist: ArtistAdminRecord) => void;
}

export function AdminArtistTable({
  artists,
  title = "Artist Records",
  description,
  emptyMessage = "No artists in this section.",
  selectedArtistId,
  onSelectArtist,
  onOpenArtistDetails,
}: AdminArtistTableProps) {
  return (
    <section className="overflow-hidden rounded-md border border-white/[0.07] bg-white/[0.025] shadow-[0_12px_32px_rgba(0,0,0,0.14)]" aria-labelledby={`admin-artists-table-heading-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
      <div className="border-b border-white/[0.07] bg-white/[0.04] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={`admin-artists-table-heading-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} className="text-xl font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-white/58">{description}</p> : null}
            <p className="mt-2 text-sm text-white/46">Click once to select an artist. Double-click to open details.</p>
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/58">
            {artists.length} {artists.length === 1 ? "artist" : "artists"}
          </span>
        </div>
      </div>
      {!artists.length ? <p className="px-4 py-5 text-sm text-white/58">{emptyMessage}</p> : null}
      {artists.length ? (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-separate border-spacing-y-2 px-2 py-2 text-left">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-white/44">
            <tr>
              <th scope="col" className="px-4 py-3">Artist</th>
              <th scope="col" className="px-4 py-3">Slug</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Sort Order</th>
              <th scope="col" className="px-4 py-3">Featured</th>
              <th scope="col" className="px-4 py-3">Updated</th>
              <th scope="col" className="px-4 py-3">Public Link</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artist) => (
              <AdminArtistTableRow
                key={artist.artistId}
                artist={artist}
                selected={artist.artistId === selectedArtistId}
                onSelect={onSelectArtist}
                onOpenDetails={onOpenArtistDetails}
              />
            ))}
          </tbody>
        </table>
      </div>
      ) : null}
    </section>
  );
}
