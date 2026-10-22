import { ListPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { PublicSongRelease } from "../../../models/release";
import { Button } from "../../../components/ui/Button";
import { memberEngagementApiService } from "../../services/MemberEngagementApiService";

interface PlaylistSummary { playlistId: string; name: string; items?: unknown[] }

export function AddReleaseToPlaylistButton({ release, compact = false }: { release: PublicSongRelease; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const toggle = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    if (playlists.length) return;
    setLoading(true);
    try {
      setPlaylists(await memberEngagementApiService.playlists() as unknown as PlaylistSummary[]);
    } catch {
      setMessage("Sign in as a member to add this song.");
    } finally {
      setLoading(false);
    }
  };

  const add = async (playlist: PlaylistSummary) => {
    setLoading(true);
    try {
      await memberEngagementApiService.addPlaylistItem(playlist.playlistId, {
        resourceType: "release",
        resourceId: release.releaseId,
        title: release.title,
        slug: release.slug,
        imageUrl: release.coverArtThumbnailUrl ?? release.coverArtUrl,
      });
      setMessage(`Added to ${playlist.name}`);
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this song.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button type="button" variant="secondary" size={compact ? "sm" : "lg"} onClick={() => void toggle()} disabled={loading}>
        <ListPlus className="h-4 w-4" aria-hidden="true" />
        {loading ? "Loading" : "Add to playlist"}
      </Button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 min-w-64 rounded-md border border-white/15 bg-night p-2 shadow-2xl">
          {playlists.map((playlist) => (
            <button key={playlist.playlistId} type="button" onClick={() => void add(playlist)} className="block w-full rounded px-3 py-2 text-left text-sm text-white/76 hover:bg-white/10">
              {playlist.name}
            </button>
          ))}
          {!loading && playlists.length === 0 ? <Link to="/member/playlists" className="block rounded px-3 py-2 text-sm font-semibold text-cyanGlow">Open member playlists</Link> : null}
        </div>
      ) : null}
      {message ? <p className="mt-2 text-xs text-white/58" role="status">{message}</p> : null}
    </div>
  );
}
