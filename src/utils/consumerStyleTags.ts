// Intake/workflow labels are retained in admin records, not consumer discovery facets.
const workflowTags = new Set(["recovered", "media-intake", "draft", "archived"]);

export function consumerStyleTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((tag): tag is string => typeof tag === "string").map(tag => tag.trim()).filter(tag => {
    const key = tag.toLowerCase();
    if (!key || workflowTags.has(key.replace(/[_\s]+/g, "-")) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
