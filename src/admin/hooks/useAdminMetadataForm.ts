import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminMetadataRecord,
  useUpdateAdminSeoMetadata,
  useUpdateAdminSocialMetadata,
} from "../../hooks/admin/useAdminContent";
import type { AdminMetadataFormState } from "../utils/adminMetadataFormUtils";
import {
  buildMetadataPreviewModel,
  createMetadataFormState,
  toSeoMetadataPayload,
  toSocialMetadataPayload,
  validateMetadataReadiness,
} from "../utils/adminMetadataFormUtils";

export function useAdminMetadataForm(metadataRecordId?: string) {
  const navigate = useNavigate();
  const recordQuery = useAdminMetadataRecord(metadataRecordId);
  const updateSeo = useUpdateAdminSeoMetadata();
  const updateSocial = useUpdateAdminSocialMetadata();
  const [formState, setFormState] = useState<AdminMetadataFormState | null>(null);
  const [initialState, setInitialState] = useState<AdminMetadataFormState | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const record = recordQuery.data?.ok ? recordQuery.data.data : null;

  useEffect(() => {
    if (record) {
      const mapped = createMetadataFormState(record);
      setFormState(mapped);
      setInitialState(mapped);
    }
  }, [record]);

  const validation = useMemo(
    () => (record && formState ? validateMetadataReadiness(formState, record) : null),
    [formState, record],
  );
  const preview = useMemo(
    () => (record && formState ? buildMetadataPreviewModel(formState, record) : null),
    [formState, record],
  );
  const isDirty = Boolean(formState && initialState && JSON.stringify(formState) !== JSON.stringify(initialState));
  const isSaving = updateSeo.isPending || updateSocial.isPending;
  const hasLoadError = recordQuery.isError || recordQuery.data?.ok === false;

  const updateField = <K extends keyof AdminMetadataFormState>(field: K, value: AdminMetadataFormState[K]) => {
    setFormState((current) => (current ? { ...current, [field]: value } : current));
  };

  const submit = async (forceNoIndex = false) => {
    setSubmitError(null);
    if (!record || !formState) {
      setSubmitError("Metadata record could not be loaded.");
      return false;
    }
    if (!record.entityId) {
      setSubmitError("Metadata record is missing an entity ID.");
      return false;
    }

    const stateToSubmit = forceNoIndex ? { ...formState, noIndex: true } : formState;
    const nextValidation = validateMetadataReadiness(stateToSubmit, record);
    if (!nextValidation.valid) {
      setSubmitError("Please resolve validation errors before saving.");
      return false;
    }

    const seoResult = await updateSeo.mutateAsync({
      entityType: record.entityType,
      entityId: record.entityId,
      payload: toSeoMetadataPayload(stateToSubmit),
    });
    if (!seoResult.ok) {
      setSubmitError(seoResult.error.message);
      return false;
    }

    const socialResult = await updateSocial.mutateAsync({
      entityType: record.entityType,
      entityId: record.entityId,
      payload: toSocialMetadataPayload(stateToSubmit, record),
    });
    if (!socialResult.ok) {
      setSubmitError(socialResult.error.message);
      return false;
    }

    const mapped = createMetadataFormState(socialResult.data);
    setFormState(mapped);
    setInitialState(mapped);
    return true;
  };

  return {
    recordQuery,
    record,
    formState,
    validation,
    preview,
    isDirty,
    isSaving,
    hasLoadError,
    submitError,
    updateField,
    submit,
    cancel: () => navigate("/admin/seo"),
  };
}
