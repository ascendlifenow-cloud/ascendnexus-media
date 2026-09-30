import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PublicErrorState, PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import type { ArtistAdminRecord } from "../../models/admin";
import { mapArtistAdminToPublicProfile } from "../../utils/admin/adminMappers";
import { buildArtistPublishReadiness } from "../../utils/admin/artistPublishingUtils";
import { useAdminMediaAssets, useArchiveAdminArtist, usePublishAdminArtist, useRestoreAdminArtist } from "../../hooks/admin/useAdminContent";
import { AdminPageHeader } from "../components";
import { ArtistPublishActionButtons, ArtistPublishReadinessPanel } from "../components/artists";
import {
  AdminArtistForm,
  AdminArtistFormActions,
  AdminArtistFormPreviewPanel,
  AdminArtistValidationSummary,
} from "../components/artists/form";
import { PublishingStatusPanel } from "../components/publishing";
import { useAdminArtistForm } from "../hooks/useAdminArtistForm";
import { usePublishingWorkflow } from "../hooks/usePublishingWorkflow";
import { toUpdateArtistDto } from "../utils/adminArtistFormUtils";

export function AdminArtistFormPage() {
  const { artistId } = useParams();
  const {
    artistQuery,
    formState,
    validation,
    isEditMode,
    isDirty,
    isSaving,
    hasLoadError,
    submitError,
    updateField,
    updateExternalLink,
    submit,
    cancel,
  } = useAdminArtistForm(artistId);
  const [pendingAction, setPendingAction] = useState<"save_draft" | "save_changes" | "activate" | "archive" | "restore" | undefined>();
  const mediaQuery = useAdminMediaAssets();
  const publishArtist = usePublishAdminArtist();
  const archiveArtist = useArchiveAdminArtist();
  const restoreArtist = useRestoreAdminArtist();
  const publishing = usePublishingWorkflow("artist", formState);
  const artistPreviewRecord = useMemo<ArtistAdminRecord>(() => {
    const payload = toUpdateArtistDto(formState);
    return {
      artistId: formState.artistId ?? "draft-artist-preview",
      displayName: payload.displayName ?? "",
      name: payload.name ?? "",
      slug: payload.slug ?? "",
      shortBio: payload.shortBio,
      bio: payload.bio ?? "",
      profileImage: payload.profileImage ?? "",
      profileThumbnailUrl: payload.profileThumbnailUrl,
      profileBannerUrl: payload.profileBannerUrl,
      status: payload.status ?? formState.status,
      sortOrder: payload.sortOrder ?? 0,
      featured: payload.featured,
      featuredSortOrder: payload.featuredSortOrder,
      genres: payload.genres,
      styleTags: payload.styleTags,
      externalLinks: payload.externalLinks,
      seoMetadata: payload.seoMetadata,
      socialMetadata: payload.socialMetadata,
      metadata: payload.metadata,
    };
  }, [formState]);
  const mediaAssets = mediaQuery.data?.ok ? mediaQuery.data.data : [];
  const artistReadiness = useMemo(
    () => buildArtistPublishReadiness(artistPreviewRecord, mediaAssets),
    [artistPreviewRecord, mediaAssets],
  );
  const publicPreview = artistReadiness.ready ? mapArtistAdminToPublicProfile({ ...artistPreviewRecord, status: "active" }) : null;
  const activateSavedArtist = async () => {
    if (!formState.artistId || !artistReadiness.ready) return;
    setPendingAction("activate");
    try {
      const savedArtist = isDirty ? await submit(false) : null;
      if (savedArtist === false) return;
      await publishArtist.mutateAsync(savedArtist?.artistId ?? formState.artistId);
    } finally {
      setPendingAction(undefined);
    }
  };
  const archiveOrRestoreArtist = async () => {
    if (!formState.artistId) return;
    const action = artistPreviewRecord.status === "archived" ? "restore" : "archive";
    setPendingAction(action);
    try {
      if (action === "restore") {
        await restoreArtist.mutateAsync(formState.artistId);
      } else {
        await archiveArtist.mutateAsync(formState.artistId);
      }
    } finally {
      setPendingAction(undefined);
    }
  };
  const saveArtist = async (draft: boolean) => {
    setPendingAction(draft ? "save_draft" : "save_changes");
    try {
      await submit(draft);
    } finally {
      setPendingAction(undefined);
    }
  };

  const title = isEditMode ? "Edit Artist" : "New Artist";
  const metadata = {
    title: `${title} | Admin | Ascend Nexus Media`,
    description: "Create and edit Ascend Nexus Media artist records.",
    type: "custom" as const,
    noIndex: true,
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={metadata} disableSocial />
      <AdminPageHeader
        title={title}
        description="Create, edit, validate, preview, and prepare Ascend Nexus Media AI Persona Artist records for future publishing workflows."
        status="ready"
      />

      {isEditMode && artistQuery.isLoading ? <GridSkeleton itemCount={4} variant="block" columns="lg:grid-cols-[1fr_24rem]" /> : null}
      {hasLoadError ? <PublicErrorState title="Artist not found" message="This admin artist record could not be loaded." /> : null}

      {(!isEditMode || artistQuery.data?.ok) && !hasLoadError ? (
        <>
          <AdminArtistValidationSummary validation={validation} submitError={submitError} />
          <div className="grid gap-6 xl:grid-cols-[1fr_26rem] xl:items-start">
            <AdminArtistForm
              state={formState}
              validation={validation}
              mediaAssets={mediaAssets}
              updateField={updateField}
              updateExternalLink={updateExternalLink}
            />
            <div className="grid gap-5 xl:sticky xl:top-24">
              <PublishingStatusPanel status={publishing.publishingStatus} />
              <ArtistPublishReadinessPanel readiness={artistReadiness} publicPreview={publicPreview} />
              <ArtistPublishActionButtons
                artist={artistPreviewRecord}
                readiness={artistReadiness}
                isSaving={publishArtist.isPending || archiveArtist.isPending || restoreArtist.isPending || publishing.isSaving}
                pendingAction={pendingAction === "activate" || pendingAction === "archive" || pendingAction === "restore" ? pendingAction : undefined}
                isDirty={isDirty}
                onActivate={() => void activateSavedArtist()}
                onArchive={() => void archiveOrRestoreArtist()}
              />
              <AdminArtistFormPreviewPanel state={formState} isDirty={isDirty} />
            </div>
          </div>
          <AdminArtistFormActions
            state={formState}
            isSaving={isSaving || publishArtist.isPending || archiveArtist.isPending || restoreArtist.isPending}
            pendingAction={pendingAction}
            isDirty={isDirty}
            onSaveDraft={() => void saveArtist(true)}
            onSave={() => void saveArtist(false)}
            onActivate={() => void activateSavedArtist()}
            onArchive={() => void archiveOrRestoreArtist()}
            publishReady={artistReadiness.ready && Boolean(formState.artistId)}
            onCancel={cancel}
          />
        </>
      ) : null}

      {!isEditMode && hasLoadError ? <PublicLoadingErrorState /> : null}
    </div>
  );
}
