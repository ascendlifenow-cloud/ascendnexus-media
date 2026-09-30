import { ArrowLeft, CalendarDays, Disc3, FilePenLine } from "lucide-react";
import { LinkButton } from "../../../components/ui/LinkButton";
import type { ArtistAdminRecord, ReleasePublishReadiness, SongReleaseAdminRecord } from "../../../models/admin";
import { ReleasePublishedStatus } from "./ReleasePublishedStatus";

interface EditReleaseHeaderProps {
  title: string;
  release: SongReleaseAdminRecord;
  artist: ArtistAdminRecord | null;
  readiness: ReleasePublishReadiness;
  isDirty: boolean;
  activePublicationAction?: "publish" | "republish" | "archive";
  onOpenPanel: () => void;
}

export function EditReleaseHeader({ title, release, artist, readiness, isDirty, activePublicationAction, onOpenPanel }: EditReleaseHeaderProps) {
  return (
    <header className="grid gap-4 rounded-anm-panel border border-white/10 bg-anm-surface/78 p-4 shadow-anm-card backdrop-blur lg:grid-cols-[minmax(0,1fr)_minmax(24rem,34rem)] lg:items-start">
      <div className="min-w-0">
        <LinkButton to="/admin/releases" variant="ghost" size="sm" className="mb-3">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Releases
        </LinkButton>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-anm-gold">{title}</p>
        <h1 className="mt-2 truncate text-3xl font-black tracking-normal text-white md:text-4xl">
          {release.title || "Untitled release"}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/58">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
            <Disc3 className="h-4 w-4 text-white/42" aria-hidden />
            {artist?.displayName ?? "Unassigned artist"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
            <CalendarDays className="h-4 w-4 text-white/42" aria-hidden />
            {release.releaseDate || "No release date"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
            <FilePenLine className="h-4 w-4 text-white/42" aria-hidden />
            {isDirty ? "Unsaved draft changes" : release.updatedAt ? `Saved ${new Date(release.updatedAt).toLocaleString()}` : "Draft ready"}
          </span>
        </div>
      </div>
      <ReleasePublishedStatus
        release={release}
        readiness={readiness}
        isDirty={isDirty}
        activePublicationAction={activePublicationAction}
        onOpenPanel={onOpenPanel}
      />
    </header>
  );
}
