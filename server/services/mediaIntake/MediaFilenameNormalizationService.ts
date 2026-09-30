import path from "node:path";

const normalize = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/['’`]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export class MediaFilenameNormalizationService {
  getBaseName(filename: string): string {
    return path.basename(filename, path.extname(filename));
  }

  normalizeArtistToken(token: string): string {
    return normalize(token.replace(/^ANMX[_-]/i, ""));
  }

  normalizeReleaseToken(token: string): string {
    return normalize(token.replace(/[_-]CoverArt$/i, ""));
  }

  normalizeGeneralToken(token: string): string {
    return normalize(token);
  }

  splitWords(token: string): string[] {
    return normalize(token).split(" ").filter(Boolean);
  }

  removeKnownSuffixes(token: string): string {
    return token.replace(/[_ -](cover\s*art|cover|profile|character\s*art|preview|master)$/i, "").trim();
  }

  buildSearchVariants(token: string): string[] {
    const stripped = this.removeKnownSuffixes(token);
    return [...new Set([token, stripped, normalize(stripped), normalize(token)].filter(Boolean))];
  }
}

export const mediaFilenameNormalizationService = new MediaFilenameNormalizationService();
