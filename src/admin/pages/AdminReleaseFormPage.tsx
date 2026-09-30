import { useEffect, useMemo, useState } from "react";
import { Check, Eye, PanelRightOpen, Save } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PublicErrorState, PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { SongReleaseAdminRecord } from "../../models/admin";
import { mapReleaseAdminToPublicRelease } from "../../utils/admin/adminMappers";
import { buildReleasePublishReadiness } from "../../utils/admin/releasePublishingUtils";
import { useAdminMediaAssets, useArchiveAdminRelease, usePublishAdminRelease, useRestoreAdminRelease } from "../../hooks/admin/useAdminContent";
import { EditReleaseHeader, ReleasePublishReadinessDrawer } from "../components/releases";
import {
  AdminReleaseForm,
  AdminReleaseValidationSummary,
} from "../components/releases/form";
import { useAdminReleaseForm } from "../hooks/useAdminReleaseForm";
import { toUpdateReleaseDto } from "../utils/adminReleaseFormUtils";
import type { ReleaseActionOperationState, ReleaseEditorAction } from "../services/releaseEditorTypes";

const RELEASE_ACTION_TIMEOUT_MS = 20000;

const withActionTimeout = async <T,>(operation: Promise<T>, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof window.setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} took too long. Please retry after checking the media/API connection.`));
    }, RELEASE_ACTION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

export function AdminReleaseFormPage() {
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    releaseQuery,
    artistsQuery,
    artists,
    selectedArtist,
    formState,
    validation,
    isEditMode,
    isDirty,
    hasLoadError,
    submitError,
    updateField,
    updateExternalLink,
    submit,
  } = useAdminReleaseForm(releaseId);
  const [activeAction, setActiveAction] = useState<ReleaseEditorAction | undefined>();
  const [activeOperation, setActiveOperation] = useState<ReleaseActionOperationState>("idle");
  const [panelSection, setPanelSection] = useState<"readiness" | "preview" | "history">("readiness");
  const [readinessPanelOpen, setReadinessPanelOpen] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const mediaQuery = useAdminMediaAssets();
  const publishRelease = usePublishAdminRelease();
  const archiveRelease = useArchiveAdminRelease();
  const restoreRelease = useRestoreAdminRelease();
  const panelParamOpen = searchParams.get("panel") === "publish-readiness";
  const panelOpen = readinessPanelOpen || panelParamOpen;
  const releasePreviewRecord = useMemo<SongReleaseAdminRecord>(() => {
    const payload = toUpdateReleaseDto(formState);
    return {
      releaseId: formState.releaseId ?? "draft-release-preview",
      songId: formState.songId || `song-${formState.slug || "preview"}`,
      artistId: payload.artistId ?? "",
      title: payload.title ?? "",
      slug: payload.slug ?? "",
      releaseDate: payload.releaseDate ?? "",
      genre: payload.genre ?? "",
      description: payload.description,
      lyrics: payload.lyrics,
      coverArtUrl: payload.coverArtUrl,
      coverArtThumbnailUrl: payload.coverArtThumbnailUrl,
      coverArtLargeUrl: payload.coverArtLargeUrl,
      audioPreviewUrl: payload.audioPreviewUrl,
      styleTags: payload.styleTags ?? [],
      status: payload.status ?? formState.status,
      externalLinks: payload.externalLinks ?? {},
      featured: payload.featured,
      featuredSortOrder: payload.featuredSortOrder,
      featuredLabel: payload.featuredLabel,
      featuredDescription: payload.featuredDescription,
      featuredPlacement: payload.featuredPlacement,
      seoMetadata: payload.seoMetadata,
      socialMetadata: payload.socialMetadata,
      metadata: payload.metadata,
    };
  }, [formState]);
  const mediaAssets = mediaQuery.data?.ok ? mediaQuery.data.data : [];
  const releaseReadiness = useMemo(
    () => buildReleasePublishReadiness(releasePreviewRecord, selectedArtist, mediaAssets),
    [mediaAssets, releasePreviewRecord, selectedArtist],
  );
  const publicPreview = releaseReadiness.ready
    ? mapReleaseAdminToPublicRelease({ ...releasePreviewRecord, status: "published" }, selectedArtist?.status === "active" ? [selectedArtist.artistId] : [])
    : null;

  const openReadinessPanel = (section: "readiness" | "preview" | "history" = "readiness") => {
    setReadinessPanelOpen(true);
    setPanelSection(section);
    if (isDirty) return;
    const next = new URLSearchParams(searchParams);
    next.set("panel", "publish-readiness");
    if (section !== "readiness") next.set("section", section);
    else next.delete("section");
    setSearchParams(next);
  };

  const closeReadinessPanel = (force = false) => {
    if (!force && isDirty && !window.confirm("Close the release panel and keep editing? Unsaved form changes will stay on the page.")) return;
    setReadinessPanelOpen(false);
    const next = new URLSearchParams(searchParams);
    next.delete("panel");
    next.delete("section");
    setSearchParams(next);
  };

  const refreshReleaseState = async () => {
    if (releaseId) await releaseQuery.refetch();
    await mediaQuery.refetch();
  };

  const completeAction = async (message: string, closePanel = true, afterComplete?: () => void) => {
    setActiveOperation("success");
    setWorkflowMessage(message);
    setWorkflowError(null);
    try {
      await withActionTimeout(refreshReleaseState(), "Release refresh");
    } finally {
      window.setTimeout(() => {
        setActiveAction(undefined);
        setActiveOperation("idle");
        if (closePanel) closeReadinessPanel(true);
        afterComplete?.();
      }, 650);
    }
  };

  const failAction = (message: string) => {
    setActiveOperation("error");
    setWorkflowMessage(null);
    setWorkflowError(message);
    window.setTimeout(() => {
      setActiveAction(undefined);
      setActiveOperation("idle");
    }, 900);
  };

  const saveRelease = async (draft: boolean, closePanel = true) => {
    setActiveAction(draft ? "save_draft" : "save_changes");
    setActiveOperation("saving");
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      setWorkflowMessage(draft ? "Saving draft..." : "Saving changes...");
      const saved = await withActionTimeout(submit(draft), draft ? "Save draft" : "Save changes");
      await completeAction(draft ? "Draft saved." : "Changes saved.", closePanel);
      return saved;
    } catch (error) {
      failAction(error instanceof Error ? error.message : "Save failed.");
      return false;
    }
  };

  const publishSavedRelease = async () => {
    if (!releaseReadiness.ready) {
      openReadinessPanel("readiness");
      failAction("Publish readiness is blocked. Resolve the listed issues before publishing.");
      return;
    }
    setActiveAction("save_and_republish");
    setActiveOperation("validating");
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      setWorkflowMessage(isDirty ? "Saving before publish..." : "Preparing publication...");
      const savedRelease = isDirty || !formState.releaseId
        ? await withActionTimeout(submit(false, { redirectOnCreate: false }), "Save before publish")
        : null;
      const targetReleaseId = savedRelease?.releaseId ?? formState.releaseId;
      if (!targetReleaseId) {
        failAction("Save the release before publishing.");
        return;
      }
      const wasPublished = formState.status === "published";
      setActiveOperation(wasPublished ? "republishing" : "publishing");
      setWorkflowMessage(wasPublished ? "Republishing release..." : "Publishing release...");
      const result = await withActionTimeout(
        publishRelease.mutateAsync(targetReleaseId),
        wasPublished ? "Republish" : "Publish",
      );
      if (!result.ok) {
        failAction(result.error.message);
        return;
      }
      await completeAction(wasPublished ? "Republished and verified." : "Published and verified.", true, () => {
        navigate("/admin/releases", { replace: true });
      });
    } catch (error) {
      failAction(error instanceof Error ? error.message : "Publication failed.");
    }
  };

  const archiveOrRestoreRelease = async () => {
    if (!formState.releaseId) return;
    const action = releasePreviewRecord.status === "archived" ? "restore" : "archive";
    if (action === "archive" && !window.confirm("Archive this release? It will be removed from normal public workflows and related listings after the backend confirms the archive.")) return;
    setActiveAction("archive");
    setActiveOperation("archiving");
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      const result = action === "restore"
        ? await restoreRelease.mutateAsync(formState.releaseId)
        : await archiveRelease.mutateAsync(formState.releaseId);
      if (!result.ok) {
        failAction(result.error.message);
        return;
      }
      await completeAction(action === "restore" ? "Release restored." : "Release archived.");
    } catch (error) {
      failAction(error instanceof Error ? error.message : "Archive action failed.");
    }
  };

  const runReleaseAction = (action: ReleaseEditorAction) => {
    if (action === "save_draft") void saveRelease(true);
    if (action === "save_changes") void saveRelease(false);
    if (action === "save_and_republish") void publishSavedRelease();
    if (action === "archive") void archiveOrRestoreRelease();
    if (action === "preview") {
      setActiveAction("preview");
      setActiveOperation("previewing");
      setWorkflowError(null);
      setPanelSection("preview");
      window.setTimeout(() => {
        setActiveOperation("success");
        setWorkflowMessage("Preview ready.");
        window.setTimeout(() => {
          setActiveAction(undefined);
          setActiveOperation("idle");
        }, 600);
      }, 250);
    }
    if (action === "cancel") closeReadinessPanel();
  };

  const actionContext = {
    release: releasePreviewRecord,
    formState,
    form: {
      isDirty,
      isValid: validation.valid,
      validationErrorCount: Object.keys(validation.errors).length,
    },
    readiness: releaseReadiness,
    activeAction,
    activeOperation,
    permissions: {
      canEdit: true,
      canPublish: true,
      canArchive: true,
      canPreview: true,
    },
  };

  const activePublicationAction = activeAction === "save_and_republish"
    ? (formState.status === "published" ? "republish" : "publish")
    : activeAction === "archive"
      ? "archive"
      : undefined;

  useEffect(() => {
    const section = searchParams.get("section");
    if ((section === "preview" || section === "history" || section === "readiness") && section !== panelSection) {
      setPanelSection(section);
    }
  }, [panelSection, searchParams]);

  useEffect(() => {
    setReadinessPanelOpen(panelParamOpen);
  }, [panelParamOpen]);

  const title = isEditMode ? "Edit Release" : "New Release";
  const metadata = {
    title: `${title} | Admin | Ascend Nexus Media`,
    description: "Create and edit Ascend Nexus Media song release records.",
    type: "custom" as const,
    noIndex: true,
  };
  const isLoading = (isEditMode && releaseQuery.isLoading) || artistsQuery.isLoading;
  const saveStateBadge = activeOperation !== "idle" && activeOperation !== "error"
    ? (
      <Badge variant="glass" className="border-sky-300/30 bg-sky-300/12 text-sky-100">
        {workflowMessage ?? "Working..."}
      </Badge>
    )
    : workflowError
      ? (
        <Badge variant="pink" className="border-rose-300/40 bg-rose-400/16 text-rose-100">
          {workflowError}
        </Badge>
      )
      : isDirty
        ? (
          <Badge variant="pink" className="border-rose-300/40 bg-rose-400/16 text-rose-100">
            Unsaved Changes
          </Badge>
        )
        : (
          <Badge variant="neutral" className="border-emerald-300/35 bg-emerald-400/14 text-emerald-100">
            All Changes Saved
          </Badge>
        );

  return (
    <div className="grid gap-6">
      <SEOHead metadata={metadata} disableSocial />

      {isLoading ? <GridSkeleton itemCount={4} variant="block" columns="lg:grid-cols-[1fr_24rem]" /> : null}
      {hasLoadError ? <PublicErrorState title="Release not found" message="This admin release record or artist list could not be loaded." /> : null}

      {!isLoading && !hasLoadError ? (
        <>
          <EditReleaseHeader
            title={title}
            release={releasePreviewRecord}
            artist={selectedArtist}
            readiness={releaseReadiness}
            isDirty={isDirty}
            activePublicationAction={activePublicationAction}
            onOpenPanel={() => openReadinessPanel("readiness")}
          />
          <AdminReleaseValidationSummary validation={validation} submitError={submitError} />
          <AdminReleaseForm
            state={formState}
            validation={validation}
            artists={artists}
            mediaAssets={mediaAssets}
            selectedArtist={selectedArtist}
            isEditMode={isEditMode}
            updateField={updateField}
            updateExternalLink={updateExternalLink}
          />
          <div className="flex flex-wrap items-center gap-2 rounded-anm-card border border-white/10 bg-white/[0.035] p-3">
            <Button
              type="button"
              variant="glass"
              onClick={() => void saveRelease(true, false)}
              disabled={activeOperation !== "idle"}
              isLoading={activeAction === "save_draft"}
            >
              <Save className="h-4 w-4" aria-hidden />
              {activeAction === "save_draft" ? "Saving Draft" : "Save Draft"}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void saveRelease(false, false)}
              disabled={activeOperation !== "idle"}
              isLoading={activeAction === "save_changes"}
            >
              <Check className="h-4 w-4" aria-hidden />
              {activeAction === "save_changes" ? "Saving Changes" : "Save Changes"}
            </Button>
            <Button type="button" variant="glass" onClick={() => openReadinessPanel("readiness")} disabled={activeOperation !== "idle"}>
              <PanelRightOpen className="h-4 w-4" aria-hidden />
              Publish Readiness
            </Button>
            <Button type="button" variant="glass" onClick={() => openReadinessPanel("preview")} disabled={activeOperation !== "idle"}>
              <Eye className="h-4 w-4" aria-hidden />
              Preview Release
            </Button>
            <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
              {saveStateBadge}
              {isDirty ? (
                <span className="text-xs font-medium text-white/50">Save before checking readiness.</span>
              ) : workflowMessage ? (
                <span className="text-xs font-medium text-emerald-100/70">{workflowMessage}</span>
              ) : null}
            </div>
          </div>
          <ReleasePublishReadinessDrawer
            open={panelOpen}
            activeSection={panelSection}
            release={releasePreviewRecord}
            formState={formState}
            artist={selectedArtist}
            readiness={releaseReadiness}
            publicPreview={publicPreview}
            isDirty={isDirty}
            actionContext={actionContext}
            message={workflowMessage}
            error={workflowError}
            onAction={runReleaseAction}
            onClose={() => closeReadinessPanel()}
            onSectionChange={(section) => {
              setPanelSection(section);
              if (isDirty) return;
              const next = new URLSearchParams(searchParams);
              next.set("panel", "publish-readiness");
              if (section === "readiness") next.delete("section");
              else next.set("section", section);
              setSearchParams(next, { replace: true });
            }}
          />
        </>
      ) : null}

      {!isEditMode && hasLoadError ? <PublicLoadingErrorState /> : null}
    </div>
  );
}
