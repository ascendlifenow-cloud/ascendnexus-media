import { publicUrlNormalizationService } from "./PublicUrlNormalizationService";

const forbiddenKeys = new Set(["fullSongUrl", "fullSongAssetId", "privatePath", "signedUrl", "adminNotes", "uploadJobId", "processingJobId"]);
const unsafeText = /(token=|signature=|private\/|full[-_ ]?song|localhost|127\.0\.0\.1|staging|\/admin|\/api)/i;

export class StructuredDataSafetyService {
  inspect(value: unknown) {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const visit = (node: unknown, path = "$") => {
      if (Array.isArray(node)) return node.forEach((item, index) => visit(item, `${path}[${index}]`));
      if (node && typeof node === "object") {
        for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
          if (forbiddenKeys.has(key)) blockingIssues.push(`Structured data contains forbidden key ${path}.${key}.`);
          visit(child, `${path}.${key}`);
        }
        return;
      }
      if (typeof node === "string") {
        if (unsafeText.test(node)) blockingIssues.push(`Structured data contains unsafe value at ${path}.`);
        if (/^https?:\/\//i.test(node) && !publicUrlNormalizationService.isPublicSafeUrl(node)) blockingIssues.push(`Structured data URL is not public-safe at ${path}.`);
      }
    };
    visit(value);
    return { valid: blockingIssues.length === 0, blockingIssues: [...new Set(blockingIssues)], warnings, checkedAt: new Date().toISOString() };
  }
}

export const structuredDataSafetyService = new StructuredDataSafetyService();
