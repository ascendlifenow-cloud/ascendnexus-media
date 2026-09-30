import type { SongReleaseRecord } from "../../models/releases/SongReleaseModel";
import type { MediaAssignmentConfidence, MediaIntakeSuggestedMatch } from "../../models/mediaIntake/MediaIntakeModels";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { mediaFilenameNormalizationService } from "./MediaFilenameNormalizationService";

const metadataStrings = (metadata: Record<string, unknown> | undefined, keys: string[]): string[] =>
  keys.flatMap((key) => {
    const value = metadata?.[key];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
    return [];
  });

export class MediaIntakeReleaseMatcher {
  async findCandidateMatches(token: string): Promise<{ matches: MediaIntakeSuggestedMatch[]; confidence: MediaAssignmentConfidence }> {
    const normalizedToken = mediaFilenameNormalizationService.normalizeReleaseToken(token);
    const releases = await releaseRepository.list({ includeArchived: true });
    const scored = releases.map((release) => this.scoreCandidate(normalizedToken, release)).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    return this.buildMatchDecision(scored);
  }

  scoreCandidate(normalizedToken: string, release: SongReleaseRecord): MediaIntakeSuggestedMatch {
    const identifiers = [release.releaseId, release.songId, release.slug, ...metadataStrings(release.metadata, ["releaseCode", "catalogCode", "runtimeIdentifier", "aliases"])]
      .map((value) => mediaFilenameNormalizationService.normalizeReleaseToken(value));
    const titles = [release.title, ...metadataStrings(release.metadata, ["titleAlias", "aliases"])]
      .map((value) => mediaFilenameNormalizationService.normalizeReleaseToken(value));
    let score = 0;
    const reasons: string[] = [];
    if (identifiers.includes(normalizedToken)) {
      score = 1;
      reasons.push("Exact release identifier/catalog match.");
    } else if (titles.includes(normalizedToken)) {
      score = 0.96;
      reasons.push("Exact normalized release title match.");
    } else if (titles.some((title) => title && (title.includes(normalizedToken) || normalizedToken.includes(title)))) {
      score = 0.76;
      reasons.push("High-similarity release title candidate.");
    }
    if (release.coverArtUrl || release.metadata?.coverArtAssetId) {
      score = Math.max(0, score - 0.08);
      if (score > 0) reasons.push("Existing cover art creates a replacement review consideration.");
    }
    return { entityType: "release", entityId: release.releaseId, label: release.title, score, reasons };
  }

  buildMatchDecision(candidates: MediaIntakeSuggestedMatch[]): { matches: MediaIntakeSuggestedMatch[]; confidence: MediaAssignmentConfidence } {
    const top = candidates[0];
    const tied = top ? candidates.filter((item) => item.score === top.score).length : 0;
    return {
      matches: candidates.slice(0, 5),
      confidence: {
        overallScore: top?.score ?? 0,
        ruleScore: 1,
        identifierScore: top?.reasons.some((reason) => reason.includes("identifier")) ? top.score : 0,
        nameScore: 0,
        titleScore: top?.reasons.some((reason) => reason.includes("title")) ? top.score : 0,
        aliasScore: 0,
        mediaTypeScore: 1,
        conflictPenalty: tied > 1 ? 1 : 0,
        candidateCount: candidates.length,
        decision: top && top.score >= 0.92 && tied === 1 ? "auto_assign" : "review_required",
        reasons: top ? top.reasons : ["No release match found."],
      },
    };
  }
}

export const mediaIntakeReleaseMatcher = new MediaIntakeReleaseMatcher();
