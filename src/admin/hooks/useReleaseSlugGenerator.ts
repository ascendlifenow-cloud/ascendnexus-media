import { slugifyReleaseValue, validateReleaseSlug } from "../utils/adminReleaseFormUtils";

export function useReleaseSlugGenerator() {
  return {
    generateSlug: slugifyReleaseValue,
    validateSlug: validateReleaseSlug,
  };
}
