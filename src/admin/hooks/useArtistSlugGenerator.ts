import { slugifyArtistValue, validateArtistSlug } from "../utils/adminArtistFormUtils";

export function useArtistSlugGenerator() {
  return {
    generateSlug: slugifyArtistValue,
    validateSlug: validateArtistSlug,
  };
}
