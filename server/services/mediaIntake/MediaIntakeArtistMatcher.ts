import type { ArtistRecord } from "../../models/artists/ArtistModel";
import type { MediaAssignmentConfidence, MediaIntakeSuggestedMatch } from "../../models/mediaIntake/MediaIntakeModels";
import { artistRepository } from "../../repositories/ArtistRepository";
import { mediaFilenameNormalizationService } from "./MediaFilenameNormalizationService";

const metadataStrings = (metadata: Record<string, unknown> | undefined, keys: string[]): string[] =>
  keys.flatMap((key) => {
    const value = metadata?.[key];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
    return [];
  });

export class MediaIntakeArtistMatcher {
  async findCandidateMatches(token: string): Promise<{ matches: MediaIntakeSuggestedMatch[]; confidence: MediaAssignmentConfidence }> {
    const normalizedToken = mediaFilenameNormalizationService.normalizeArtistToken(token);
    const artists = await artistRepository.list({ includeArchived: true });
    const scored = artists.map((artist) => this.scoreCandidate(normalizedToken, artist)).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    return this.buildMatchDecision(scored);
  }

  scoreCandidate(normalizedToken: string, artist: ArtistRecord): MediaIntakeSuggestedMatch {
    const identifiers = [artist.artistId, artist.slug, ...metadataStrings(artist.metadata, ["artistCode", "runtimeIdentifier", "code", "aliases"])]
      .map((value) => mediaFilenameNormalizationService.normalizeArtistToken(value));
    const names = [artist.name, artist.displayName, ...metadataStrings(artist.metadata, ["stageName", "aliases"])]
      .map((value) => mediaFilenameNormalizationService.normalizeArtistToken(value));
    let score = 0;
    const reasons: string[] = [];
    if (identifiers.includes(normalizedToken)) {
      score = 1;
      reasons.push("Exact artist identifier/code match.");
    } else if (names.includes(normalizedToken)) {
      score = 0.96;
      reasons.push("Exact normalized artist name match.");
    } else if (names.some((name) => name && (name.includes(normalizedToken) || normalizedToken.includes(name)))) {
      score = 0.78;
      reasons.push("High-similarity artist name candidate.");
    }
    return { entityType: "artist", entityId: artist.artistId, label: artist.displayName || artist.name, score, reasons };
  }

  buildMatchDecision(candidates: MediaIntakeSuggestedMatch[]): { matches: MediaIntakeSuggestedMatch[]; confidence: MediaAssignmentConfidence } {
    const top = candidates[0];
    const tied = top ? candidates.filter((item) => item.score === top.score).length : 0;
    const decision = top && top.score >= 0.92 && tied === 1 ? "auto_assign" : candidates.length ? "review_required" : "review_required";
    return {
      matches: candidates.slice(0, 5),
      confidence: {
        overallScore: top?.score ?? 0,
        ruleScore: 1,
        identifierScore: top?.reasons.some((reason) => reason.includes("identifier")) ? top.score : 0,
        nameScore: top?.reasons.some((reason) => reason.includes("name")) ? top.score : 0,
        titleScore: 0,
        aliasScore: 0,
        mediaTypeScore: 1,
        conflictPenalty: tied > 1 ? 1 : 0,
        candidateCount: candidates.length,
        decision,
        reasons: top ? top.reasons : ["No artist match found."],
      },
    };
  }
}

export const mediaIntakeArtistMatcher = new MediaIntakeArtistMatcher();
