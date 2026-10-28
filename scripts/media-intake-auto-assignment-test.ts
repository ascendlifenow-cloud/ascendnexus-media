import assert from "node:assert/strict";
import { mediaIntakeArtistMatcher } from "../server/services/mediaIntake/MediaIntakeArtistMatcher";
import { mediaIntakeReleaseMatcher } from "../server/services/mediaIntake/MediaIntakeReleaseMatcher";
import { mediaIntakeConfigService } from "../server/services/mediaIntake/MediaIntakeConfigService";
import type { MediaIntakeSuggestedMatch } from "../server/models/mediaIntake/MediaIntakeModels";

const previous = process.env.MEDIA_INTAKE_MIN_CONFIDENCE;
try {
  process.env.MEDIA_INTAKE_MIN_CONFIDENCE = "0.60";
  for (const matcher of [mediaIntakeArtistMatcher, mediaIntakeReleaseMatcher]) {
    const candidate: MediaIntakeSuggestedMatch = { entityType: "release", entityId: "test", label: "Test", score: 0.76, reasons: ["High-similarity title"] };
    assert.equal(matcher.buildMatchDecision([candidate]).confidence.decision, "auto_assign");
    assert.equal(matcher.buildMatchDecision([{ ...candidate, score: 0.60 }]).confidence.decision, "review_required");
    assert.equal(matcher.buildMatchDecision([{ ...candidate, score: 0.59 }]).confidence.decision, "review_required");
    assert.equal(matcher.buildMatchDecision([candidate, { ...candidate, entityId: "other", score: 0.7 }]).confidence.decision, "review_required");
    assert.equal(matcher.buildMatchDecision([candidate, { ...candidate, entityId: "other" }]).confidence.decision, "review_required");
    assert.equal(matcher.buildMatchDecision([]).confidence.decision, "review_required");
    assert.equal((await matcher.findCandidateMatches("")).matches.length, 0);
  }
  process.env.MEDIA_INTAKE_MIN_CONFIDENCE = "invalid";
  assert.equal(mediaIntakeConfigService.getConfig().minConfidence, 1);
  console.log(JSON.stringify({ success: true, checked: ["above 60%", "60% boundary", "below threshold", "ambiguous candidates", "ties", "empty tokens", "invalid configuration fails closed"] }));
} finally { if (previous === undefined) delete process.env.MEDIA_INTAKE_MIN_CONFIDENCE; else process.env.MEDIA_INTAKE_MIN_CONFIDENCE = previous; }
