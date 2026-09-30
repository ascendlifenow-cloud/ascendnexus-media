import { slugifyGalleryValue, validateGalleryItemSlug } from "../utils/adminGalleryFormUtils";

export function useGalleryItemSlugGenerator() {
  return {
    generateSlug: slugifyGalleryValue,
    validateSlug: validateGalleryItemSlug,
  };
}
