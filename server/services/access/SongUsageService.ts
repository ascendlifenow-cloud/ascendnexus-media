import { createHash } from "node:crypto";
import type { MemberSongUsageRecord } from "../../models/members/MemberSongUsageModel";
import type { ProtectedMediaAuthorizationRecord, AccessPolicyRule } from "../../models/membership/MembershipAccessModels";
import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";
import { resolveMemberEntitlements } from "./EffectiveEntitlementService";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { databaseConnectionService } from "../../database/DatabaseConnectionService";

let indexes: Promise<unknown> | undefined;
export async function ensureSongUsagePersistence() {
  if (!databaseConnectionService.isConfigured()) return;
  indexes ??= (async () => {
    const db = await databaseConnectionService.getDb();
    await db.collection("member_song_usage").createIndex({ usageId: 1 }, { unique: true, name: "memberSongUsageId_unique" });
    await db.collection("member_song_usage").createIndex({ memberId: 1, songId: 1 }, { unique: true, name: "memberSongUsage_member_song_unique" });
  })().catch((error) => { indexes = undefined; throw error; });
  await indexes;
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const classifications: Record<string, string> = { public: "content.public.view", guest_preview: "content.public.view", registered_member: "content.member.view", free_member: "content.free.view", premium_member: "content.premium.view", supporter: "content.supporter.view", vip: "content.vip.view", unlisted: "content.member.view" };
const validDate = (value: string | undefined) => value == null || Number.isFinite(Date.parse(value));
const windowActive = (startsAt?: string, endsAt?: string) => validDate(startsAt) && validDate(endsAt) && (!startsAt || Date.parse(startsAt) <= Date.now()) && (!endsAt || Date.parse(endsAt) > Date.now());

function usageFor(data: MediaDatabaseShape, memberId: string, releaseId: string, songId: string): MemberSongUsageRecord {
  const saved = data.memberSongUsage.find((item) => item.memberId === memberId && item.songId === songId);
  if (saved) {
    if (!Number.isSafeInteger(saved.streamStarts) || saved.streamStarts < 0 || !Number.isSafeInteger(saved.downloadStarts) || saved.downloadStarts < 0 || typeof saved.freePlayUsed !== "boolean") throw new AuthApiError("SONG_USAGE_INVALID", "Song usage needs administrative review.", 503);
    return saved;
  }
  const mediaIds = new Set(data.mediaAssetLinks.filter((item) => item.entityType === "release" && item.entityId === releaseId && ["fullSongUrl", "fullSongAssetId"].includes(item.fieldKey)).map((item) => item.assetId));
  const release = data.releaseRecords.find((item) => item.releaseId === releaseId);
  mediaIds.add(String(release?.metadata?.fullSongAssetId ?? ""));
  const legacy = data.protectedMediaAuthorizations.filter((item) => item.memberId === memberId && item.useCount > 0 && (item.resourceId === releaseId || item.metadata?.releaseId === releaseId || mediaIds.has(item.mediaId)));
  const free = legacy.find((item) => item.action === "stream" && item.metadata?.allowance === "free_single_full_play");
  const now = new Date().toISOString();
  return { usageId: `song-usage-${hash(JSON.stringify([memberId, songId]))}`, memberId, releaseId, songId, streamStarts: legacy.filter((item) => item.action === "stream").length, downloadStarts: legacy.filter((item) => item.action === "download").length,
    freePlayUsed: Boolean(free), freeAuthorizationId: free?.authorizationId, createdAt: now, updatedAt: now, schemaVersion: 1 };
}

function matchesRule(rule: AccessPolicyRule, allowed: string[]) {
  if (!rule.enabled) return false;
  if (!Array.isArray(rule.requiredEntitlements) || !Number.isFinite(rule.priority) || !["allow", "deny"].includes(rule.effect)) throw new Error("Invalid policy");
  if ([rule.subjectConditions, rule.resourceConditions, rule.environmentConditions, rule.timeConditions, rule.quotaConditions].some((conditions) => Object.keys(conditions ?? {}).length) || rule.requiredPermissions?.length) throw new Error("Unsupported policy conditions");
  return rule.requiredEntitlements.every((key) => allowed.includes(key))
    && (!rule.requiredAccountStatus?.length || rule.requiredAccountStatus.includes("Active"))
    && (!rule.requiredMembershipStatus?.length || rule.requiredMembershipStatus.includes("active"))
    && (!rule.requiredPublicationStatus?.length || rule.requiredPublicationStatus.includes("published"));
}

export function evaluateSongAction(data: MediaDatabaseShape, memberId: string, releaseId: string, action: "stream" | "download", authorizationId?: string) {
  const snapshot = resolveMemberEntitlements(data, memberId, { resourceType: "release", resourceId: releaseId });
  const release = data.releaseRecords.find((item) => item.releaseId === releaseId);
  const usage = usageFor(data, memberId, releaseId, release?.songId ?? releaseId);
  const result = (allowed: boolean, reasonCode: string, mode: "unlimited" | "single_play" | "denied" = "denied") => ({ allowed, reasonCode, mode, releaseId, songId: release?.songId ?? releaseId,
    authorizationVersion: snapshot.authorizationVersion, tierKey: snapshot.tierKey, accountStatus: data.memberAccounts.find((member) => member.memberId === memberId)?.status ?? "Unavailable",
    remainingFullPlays: mode === "single_play" ? usage.freePlayUsed ? 0 : 1 : null, streamStarts: usage.streamStarts, downloadStarts: usage.downloadStarts,
    lastStreamAt: usage.lastStreamAt ?? null, lastDownloadAt: usage.lastDownloadAt ?? null, usageStatus: usage.streamStarts ? "started" : "not_started" });
  if (snapshot.status !== "active") return result(false, "SONG_ACCOUNT_INACTIVE");
  if (!release || release.status !== "published" || release.publicationState !== "published" || release.deletedAt) return result(false, "SONG_UNAVAILABLE");
  if (data.adminAuditEvents.some((event) => event.entityId === releaseId && event.action === "production_draft_ingested")) return result(false, "SONG_UNAVAILABLE");
  const metadataEmbargo = release.metadata?.embargoUntil;
  if (metadataEmbargo != null && (typeof metadataEmbargo !== "string" || !validDate(metadataEmbargo) || Date.parse(metadataEmbargo) > Date.now())) return result(false, "SONG_WINDOW_UNAVAILABLE");
  if (data.protectedContentTakedowns.some((item) => item.status === "active" && ((item.resourceType === "release" && item.resourceId === releaseId) || (item.resourceType === "global")))) return result(false, "SONG_UNAVAILABLE");
  const requirements = data.contentEntitlementRequirements.filter((item) => item.contentType === "release" && item.contentId === releaseId && item.status === "active");
  if (requirements.length > 1 || (!requirements.length && release.publicVisibility !== true)) return result(false, "SONG_POLICY_INVALID");
  const requirement = requirements[0];
  const publicReleaseAt = requirement?.publicReleaseAt ?? release.releaseDate;
  if (!validDate(publicReleaseAt)) return result(false, "SONG_WINDOW_UNAVAILABLE");
  if (publicReleaseAt && Date.parse(publicReleaseAt) > Date.now() && (!snapshot.allowed.includes("release.early_access") || !requirement?.earlyAccessStartsAt || !validDate(requirement.earlyAccessStartsAt) || Date.parse(requirement.earlyAccessStartsAt) > Date.now())) return result(false, "SONG_WINDOW_UNAVAILABLE");
  const entitlement = action === "stream" ? "audio.stream.full" : "audio.download";
  if (!data.entitlementDefinitions.some((definition) => definition.entitlementKey === entitlement && definition.status === "active")) return result(false, "SONG_ENTITLEMENT_REQUIRED");
  const selectedMediaId = action === "download" ? requirement?.downloadAssetId ?? release.metadata?.fullSongAssetId : requirement?.streamAssetId ?? release.metadata?.fullSongAssetId;
  if (data.protectedContentTakedowns.some((item) => item.status === "active" && ((item.resourceType === "media" && item.resourceId === selectedMediaId) || (item.resourceType === "artist" && item.resourceId === release.artistId)))) return result(false, "SONG_UNAVAILABLE");
  const overrides = data.accessOverrides.filter((item) => ["active", "scheduled"].includes(item.status)
    && (item.scopeType === "global" || (["content", "release"].includes(item.scopeType) && item.scopeId === releaseId) || (item.scopeType === "artist" && item.scopeId === release.artistId) || (item.scopeType === "media" && item.scopeId === selectedMediaId))
    && (item.subjectType === "all_authenticated" || (item.subjectType === "member" && item.subjectId === memberId) || (item.subjectType === "tier" && item.subjectId === snapshot.tierId))
    && (!item.entitlementKey || item.entitlementKey === entitlement));
  if (overrides.some((item) => !validDate(item.startsAt) || !validDate(item.endsAt) || (item.effect === "deny" && windowActive(item.startsAt, item.endsAt)))) return result(false, "SONG_OVERRIDE_DENIED");
  if (requirement) {
    if (!windowActive(requirement.startsAt, requirement.endsAt) || !validDate(requirement.embargoUntil) || (requirement.embargoUntil && Date.parse(requirement.embargoUntil) > Date.now())) return result(false, "SONG_WINDOW_UNAVAILABLE");
    const classification = classifications[requirement.accessClassification];
    if (!classification || !snapshot.allowed.includes(classification) || !requirement.requiredEntitlementKeys.every((key) => snapshot.allowed.includes(key))
      || (requirement.requiredAnyEntitlementKeys?.length && !requirement.requiredAnyEntitlementKeys.some((key) => snapshot.allowed.includes(key)))
      || requirement.deniedEntitlementKeys?.some((key) => snapshot.allowed.includes(key))) return result(false, "SONG_ACCESS_DENIED");
    const policy = data.contentAccessPolicies.find((item) => item.policyId === requirement.policyId && item.status === "published");
    if (!policy || !windowActive(policy.startsAt, policy.endsAt)) return result(false, "SONG_POLICY_INVALID");
    try {
      const rules = policy.rules.filter((rule) => matchesRule(rule, snapshot.allowed));
      if (rules.some((rule) => rule.effect === "deny") || (!rules.some((rule) => rule.effect === "allow") && policy.defaultEffect !== "allow_public")) return result(false, "SONG_ACCESS_DENIED");
    } catch { return result(false, "SONG_POLICY_INVALID"); }
    if (action === "download" && (!requirement.downloadAssetId || policy.downloadPolicy?.enabled !== true)) return result(false, "SONG_DOWNLOAD_DISABLED");
  } else if (action === "download" && release.metadata?.downloadEnabled !== true) return result(false, "SONG_DOWNLOAD_DISABLED");
  if (snapshot.denied.includes(entitlement)) return result(false, "SONG_ACCESS_DENIED");
  const authorization = authorizationId ? data.protectedMediaAuthorizations.find((item) => item.authorizationId === authorizationId && item.memberId === memberId && item.resourceId === releaseId && item.action === action) : undefined;
  if (snapshot.allowed.includes(entitlement)) {
    if (authorization && authorization.entitlementKey !== entitlement) return result(false, "SONG_AUTHORIZATION_CHANGED");
    return result(true, "SONG_ENTITLEMENT_ALLOWED", "unlimited");
  }
  if (action === "stream" && snapshot.tierKey === "free" && snapshot.allowed.includes("audio.preview.extended")) {
    if (authorization && authorization.entitlementKey !== "audio.stream.full.single_play") return result(false, "SONG_AUTHORIZATION_CHANGED");
    if (!usage.freePlayUsed || usage.freeAuthorizationId === authorizationId) return result(true, "SONG_INCLUDED_PLAY_ALLOWED", "single_play");
    return result(false, "PROTECTED_CONTENT_PLAY_ALLOWANCE_USED", "single_play");
  }
  return result(false, "SONG_ENTITLEMENT_REQUIRED");
}

export function songMediaMatches(data: MediaDatabaseShape, releaseId: string, mediaId: string, action: "stream" | "download") {
  const release = data.releaseRecords.find((item) => item.releaseId === releaseId);
  const requirement = data.contentEntitlementRequirements.find((item) => item.contentType === "release" && item.contentId === releaseId && item.status === "active");
  const expectedId = action === "download" ? requirement?.downloadAssetId ?? release?.metadata?.fullSongAssetId : requirement?.streamAssetId ?? release?.metadata?.fullSongAssetId;
  return typeof expectedId === "string" && expectedId === mediaId;
}

export function recordSongDelivery(data: MediaDatabaseShape, authorization: ProtectedMediaAuthorizationRecord, action: "stream" | "download") {
  const decision = evaluateSongAction(data, authorization.memberId, authorization.resourceId, action, authorization.authorizationId);
  if (!decision.allowed) throw new AuthApiError(decision.reasonCode, "Song access is unavailable.", 403);
  if (authorization.metadata?.songUsageRecorded === true) return;
  const usage = usageFor(data, authorization.memberId, authorization.resourceId, decision.songId);
  const existing = data.memberSongUsage.find((item) => item.usageId === usage.usageId);
  const now = new Date().toISOString();
  if (action === "stream") {
    usage.streamStarts++;
    usage.lastStreamAt = now;
    if (decision.mode === "single_play") { usage.freePlayUsed = true; usage.freeAuthorizationId = authorization.authorizationId; }
  } else { usage.downloadStarts++; usage.lastDownloadAt = now; }
  usage.updatedAt = now;
  if (!existing) data.memberSongUsage.push(usage);
  authorization.metadata = { ...authorization.metadata, songUsageRecorded: true };
  data.memberAccessHistory.push({ accessHistoryId: `song-delivery-${hash(authorization.authorizationId)}`, memberId: authorization.memberId, resourceType: "release", resourceId: authorization.resourceId,
    action: `song_${action}_started`, decision: "allow", reasonCode: decision.reasonCode, occurredAt: now, sessionReferenceHash: authorization.sessionIdHash,
    metadataSafe: { tierKey: decision.tierKey, includedPlay: decision.mode === "single_play", trackingSource: "authorized_delivery" }, schemaVersion: 1 });
}

export const songUsageService = {
  async summary(memberId: string, slugOrId: string, sessionId?: string) {
    const data = await jsonDatabase.read();
    const release = data.releaseRecords.find((item) => item.releaseId === slugOrId || item.slug === slugOrId);
    if (!release) throw new AuthApiError("SONG_UNAVAILABLE", "Song is unavailable.", 404);
    const stream = evaluateSongAction(data, memberId, release.releaseId, "stream");
    const download = evaluateSongAction(data, memberId, release.releaseId, "download");
    if (["SONG_UNAVAILABLE", "SONG_POLICY_INVALID", "SONG_ACCESS_DENIED", "SONG_WINDOW_UNAVAILABLE", "SONG_OVERRIDE_DENIED"].includes(stream.reasonCode)) throw new AuthApiError("SONG_UNAVAILABLE", "Song is unavailable.", 404);
    const current = data.protectedMediaAuthorizations.find((item) => item.memberId === memberId && item.resourceId === release.releaseId && item.action === "stream" && item.status === "active" && item.metadata?.songUsageRecorded === true && Date.parse(item.expiresAt) > Date.now() && item.sessionIdHash === hashSecret(sessionId ?? "") && item.authorizationVersion === stream.authorizationVersion && evaluateSongAction(data, memberId, release.releaseId, "stream", item.authorizationId).allowed);
    const playback = data.protectedPlaybackSessions.filter((item) => item.memberId === memberId && item.contentId === release.releaseId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    const playbackStatus = !playback ? "not_started" : ["completed", "failed"].includes(playback.status) ? `${playback.status}_reported` : Date.parse(playback.expiresAt) <= Date.now() ? "expired" : playback.status;
    return { ...stream, playbackStatus, canStream: stream.allowed, canContinue: Boolean(current), canDownload: download.allowed, downloadReasonCode: download.reasonCode, trackingConvention: "Delivery starts are server-recorded. Playing/completed states are client reports, not proof of a completed listen." };
  },
};
