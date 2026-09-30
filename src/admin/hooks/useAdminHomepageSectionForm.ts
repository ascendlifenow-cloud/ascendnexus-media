import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminSiteConfig, useUpdateAdminSiteConfig } from "../../hooks/admin/useAdminContent";
import type { AdminHomepageSectionFormState } from "../utils/adminHomepageSectionFormUtils";
import {
  createEmptyHomepageSectionFormState,
  mapHomepageSectionToFormState,
  slugifyHomepageSectionValue,
  toHomepageSectionConfig,
  validateHomepageSectionForm,
} from "../utils/adminHomepageSectionFormUtils";

export function useAdminHomepageSectionForm(sectionId?: string) {
  const navigate = useNavigate();
  const isEditMode = Boolean(sectionId);
  const siteConfigQuery = useAdminSiteConfig();
  const updateSiteConfig = useUpdateAdminSiteConfig();
  const siteConfig = siteConfigQuery.data?.ok ? siteConfigQuery.data.data : undefined;
  const [formState, setFormState] = useState<AdminHomepageSectionFormState>(() => createEmptyHomepageSectionFormState());
  const [initialState, setInitialState] = useState<AdminHomepageSectionFormState>(() => createEmptyHomepageSectionFormState());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existingSection = useMemo(
    () => siteConfig?.homepageSections.find((section) => section.sectionId === sectionId) ?? null,
    [sectionId, siteConfig?.homepageSections],
  );

  useEffect(() => {
    if (!isEditMode) {
      const empty = createEmptyHomepageSectionFormState();
      setFormState(empty);
      setInitialState(empty);
      return;
    }
    if (existingSection) {
      const mapped = mapHomepageSectionToFormState(existingSection);
      setFormState(mapped);
      setInitialState(mapped);
    }
  }, [existingSection, isEditMode]);

  const validation = useMemo(() => validateHomepageSectionForm(formState), [formState]);
  const isDirty = JSON.stringify(formState) !== JSON.stringify(initialState);
  const isSaving = updateSiteConfig.isPending;
  const isLoading = siteConfigQuery.isLoading;
  const hasLoadError = siteConfigQuery.isError || siteConfigQuery.data?.ok === false || (isEditMode && siteConfigQuery.data?.ok && !existingSection);

  const updateField = <K extends keyof AdminHomepageSectionFormState>(
    field: K,
    value: AdminHomepageSectionFormState[K],
  ) => {
    setFormState((current) => {
      const next = { ...current, [field]: value };
      if (field === "sectionType" && !current.sectionId.trim()) {
        next.sectionId = `homepage-${slugifyHomepageSectionValue(String(value).replace(/_/g, "-"))}`;
      }
      if (field === "title" && !current.sectionId.trim()) {
        next.sectionId = slugifyHomepageSectionValue(String(value));
      }
      return next;
    });
  };

  const submit = async (forceDisabled = false) => {
    setSubmitError(null);
    if (!siteConfig) {
      setSubmitError("Homepage config could not be loaded.");
      return false;
    }

    const stateToSubmit = forceDisabled ? { ...formState, enabled: false } : formState;
    const nextValidation = validateHomepageSectionForm(stateToSubmit);
    if (!nextValidation.valid) {
      setSubmitError("Please resolve validation errors before saving.");
      return false;
    }

    const nextSection = toHomepageSectionConfig(stateToSubmit);
    const nextSections = isEditMode
      ? siteConfig.homepageSections.map((section) => (section.sectionId === sectionId ? nextSection : section))
      : [...siteConfig.homepageSections, nextSection];

    const result = await updateSiteConfig.mutateAsync({
      homepageSections: nextSections.sort((a, b) => a.sortOrder - b.sortOrder || a.sectionId.localeCompare(b.sectionId)),
    });

    if (!result.ok) {
      setSubmitError(result.error.message);
      return false;
    }

    const savedSection = result.data.homepageSections.find((section) => section.sectionId === nextSection.sectionId) ?? nextSection;
    const mapped = mapHomepageSectionToFormState(savedSection);
    setFormState(mapped);
    setInitialState(mapped);
    if (!isEditMode) navigate(`/admin/homepage/sections/${savedSection.sectionId}/edit`);
    return true;
  };

  return {
    siteConfigQuery,
    siteConfig,
    existingSection,
    formState,
    validation,
    isEditMode,
    isDirty,
    isSaving,
    isLoading,
    hasLoadError,
    submitError,
    updateField,
    submit,
    cancel: () => navigate("/admin/homepage"),
  };
}
