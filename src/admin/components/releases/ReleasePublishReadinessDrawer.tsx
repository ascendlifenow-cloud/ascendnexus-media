import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ArtistAdminRecord, ReleasePublishReadiness, SongReleaseAdminRecord } from "../../../models/admin";
import type { PublicSongRelease } from "../../../models/release";
import { Button } from "../../../components/ui/Button";
import { cx } from "../../../utils/format";
import type { AdminReleaseFormState } from "../../utils/adminReleaseFormUtils";
import type { ReleaseActionContext, ReleaseEditorAction } from "../../services/releaseEditorTypes";
import { ReleaseActionBar } from "./ReleaseActionBar";
import { ReleasePublicationImpact } from "./ReleasePublicationImpact";
import { ReleasePreviewPanel } from "./ReleasePreviewPanel";
import { ReleasePublishReadinessPanel } from "./ReleasePublishReadinessPanel";

interface ReleasePublishReadinessDrawerProps {
  open: boolean;
  activeSection: "readiness" | "preview" | "history";
  release: SongReleaseAdminRecord;
  formState: AdminReleaseFormState;
  artist: ArtistAdminRecord | null;
  readiness: ReleasePublishReadiness;
  publicPreview: PublicSongRelease | null;
  isDirty: boolean;
  actionContext: ReleaseActionContext;
  message?: string | null;
  error?: string | null;
  onAction: (action: ReleaseEditorAction) => void;
  onClose: () => void;
  onSectionChange: (section: "readiness" | "preview" | "history") => void;
}

export function ReleasePublishReadinessDrawer({
  open,
  activeSection,
  release,
  formState,
  artist,
  readiness,
  publicPreview,
  isDirty,
  actionContext,
  message,
  error,
  onAction,
  onClose,
  onSectionChange,
}: ReleasePublishReadinessDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => panelRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  const drawer = (
    <div className={cx("fixed inset-0 z-[70]", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div className={cx("absolute inset-0 transition-colors duration-[var(--release-panel-transition-duration)]", open ? "bg-black/40" : "bg-black/0")} onClick={onClose} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-readiness-panel-title"
        className={cx(
          "absolute right-0 top-0 flex h-full w-full max-w-[var(--release-readiness-panel-max-width)] flex-col overflow-hidden border-l border-white/12 bg-[#10131d] shadow-2xl transition-transform duration-[var(--release-panel-transition-duration)] sm:w-[var(--release-readiness-panel-width)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-anm-gold">Edit Release Workflow</p>
            <h2 id="release-readiness-panel-title" className="mt-1 truncate text-xl font-black tracking-normal text-white">{release.title || "Untitled release"}</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close release publish readiness panel">
            <X className="h-4 w-4" aria-hidden />
            Close
          </Button>
        </div>
        <ReleaseActionBar context={actionContext} onAction={onAction} onClose={onClose} />
        <div className="flex shrink-0 gap-2 border-b border-white/10 px-4 py-3" role="tablist" aria-label="Release panel sections">
          {(["readiness", "preview", "history"] as const).map((section) => (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={activeSection === section}
              className={cx(
                "min-h-9 rounded-md px-3 text-sm font-semibold capitalize text-white/62 transition hover:bg-white/[0.06] hover:text-white",
                activeSection === section && "bg-white/[0.08] text-white",
              )}
              onClick={() => onSectionChange(section)}
            >
              {section}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {message ? <div className="mb-4 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100" role="status">{message}</div> : null}
          {error ? <div className="mb-4 rounded-md border border-rose-300/20 bg-rose-300/10 p-3 text-sm font-semibold text-rose-100" role="alert">{error}</div> : null}
          <div className={cx("grid gap-5", activeSection !== "readiness" && "hidden")}>
            <ReleasePublishReadinessPanel readiness={readiness} publicPreview={publicPreview} />
          </div>
          <div className={cx("grid gap-5", activeSection !== "preview" && "hidden")}>
            <ReleasePreviewPanel state={formState} artist={artist} isDirty={isDirty} />
          </div>
          <div className={cx("grid gap-5", activeSection !== "history" && "hidden")}>
            <ReleasePublicationImpact release={release} readiness={readiness} />
          </div>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
