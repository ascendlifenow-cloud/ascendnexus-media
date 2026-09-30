const controlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const htmlLike = /<[^>]*>/g;

export class PublicFormNormalizationService {
  normalizeName(value: unknown): string {
    return this.cleanSingleLine(value).slice(0, 120);
  }

  normalizeEmail(value: unknown): string {
    const email = this.cleanSingleLine(value).slice(0, 320);
    if (email.includes("\r") || email.includes("\n")) return "";
    const [local, domain] = email.split("@");
    return local && domain ? `${local}@${domain.toLowerCase()}` : email.toLowerCase();
  }

  normalizeSubject(value: unknown): string {
    return this.cleanSingleLine(value).slice(0, 200);
  }

  normalizeMessage(value: unknown): string {
    return String(value ?? "")
      .normalize("NFKC")
      .replace(controlChars, "")
      .replace(/\r\n?/g, "\n")
      .replace(htmlLike, "")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim()
      .slice(0, 5000);
  }

  normalizeCompany(value: unknown): string {
    return this.cleanSingleLine(value).slice(0, 200);
  }

  normalizePhone(value: unknown): string {
    return this.cleanSingleLine(value).replace(/[^\d+().\-\s]/g, "").slice(0, 40);
  }

  normalizeSourceContext(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const allowed = ["variant", "campaign", "page", "section", "referrer"];
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key, child]) => allowed.includes(key) && ["string", "number", "boolean"].includes(typeof child))
      .map(([key, child]) => [key, typeof child === "string" ? this.cleanSingleLine(child).slice(0, 160) : child]));
  }

  private cleanSingleLine(value: unknown): string {
    return String(value ?? "").normalize("NFKC").replace(controlChars, "").replace(/[\r\n]/g, " ").replace(/\s+/g, " ").trim();
  }
}

export const publicFormNormalizationService = new PublicFormNormalizationService();
