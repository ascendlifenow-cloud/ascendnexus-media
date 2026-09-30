import { slugifyHomepageSectionValue, validateHomepageSectionId } from "../utils/adminHomepageSectionFormUtils";

export function useHomepageSectionIdGenerator() {
  return {
    generateSectionId: slugifyHomepageSectionValue,
    validateSectionId: validateHomepageSectionId,
  };
}
