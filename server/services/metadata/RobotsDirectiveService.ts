export interface RobotsDirectives {
  index: boolean;
  follow: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  maxSnippet?: number;
  maxImagePreview?: "none" | "standard" | "large";
  maxVideoPreview?: number;
}

export class RobotsDirectiveService {
  resolveDefaults(indexable: boolean): RobotsDirectives {
    return { index: indexable, follow: true, maxImagePreview: "large" };
  }

  validate(directives: RobotsDirectives) {
    const errors: string[] = [];
    if (directives.maxSnippet !== undefined && directives.maxSnippet < -1) errors.push("maxSnippet must be -1 or greater.");
    if (directives.maxVideoPreview !== undefined && directives.maxVideoPreview < -1) errors.push("maxVideoPreview must be -1 or greater.");
    return { valid: errors.length === 0, errors };
  }

  serialize(directives: RobotsDirectives) {
    const parts = [directives.index ? "index" : "noindex", directives.follow ? "follow" : "nofollow"];
    if (directives.noarchive) parts.push("noarchive");
    if (directives.nosnippet) parts.push("nosnippet");
    if (directives.maxSnippet !== undefined) parts.push(`max-snippet:${directives.maxSnippet}`);
    if (directives.maxImagePreview) parts.push(`max-image-preview:${directives.maxImagePreview}`);
    if (directives.maxVideoPreview !== undefined) parts.push(`max-video-preview:${directives.maxVideoPreview}`);
    return parts.join(", ");
  }
}

export const robotsDirectiveService = new RobotsDirectiveService();
