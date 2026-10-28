import { MongoClient } from "mongodb";
import type { MediaDatabaseShape } from "../server/services/media/JsonDatabase";
import { evaluateSongAction } from "../server/services/access/SongUsageService";
import { resolveMemberEntitlements } from "../server/services/access/EffectiveEntitlementService";

if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "") || !process.env.MONGODB_URI) throw new Error("Explicit staging configuration is required.");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const data: Record<string, unknown[]> = {};
  const collections: Record<string, string> = {
    memberAccounts: "member_accounts", memberMembershipAssignments: "member_membership_assignments", membershipTiers: "membership_tiers",
    entitlementDefinitions: "entitlement_definitions", tierEntitlementGrants: "tier_entitlement_grants", memberEntitlementGrants: "member_entitlement_grants",
    releaseRecords: "song_releases", mediaAssetLinks: "media_asset_links", protectedMediaAuthorizations: "protected_media_authorizations", memberSongUsage: "member_song_usage",
    protectedContentTakedowns: "protected_content_takedowns", accessOverrides: "access_overrides", contentAccessPolicies: "content_access_policies", contentEntitlementRequirements: "content_entitlement_requirements", adminAuditEvents: "admin_audit_events",
  };
  for (const [key, collection] of Object.entries(collections)) {
    const projection = key === "memberAccounts" ? { _id: 0, memberId: 1, status: 1, emailVerified: 1, metadata: 1 }
      : key === "adminAuditEvents" ? { _id: 0, entityId: 1, action: 1 }
        : key === "releaseRecords" ? { _id: 0, releaseId: 1, songId: 1, artistId: 1, status: 1, publicationState: 1, publicVisibility: 1, deletedAt: 1, releaseDate: 1, metadata: 1 }
          : { _id: 0 };
    data[key] = await db.collection(collection).find({}, { projection }).toArray();
  }
  const snapshot = data as unknown as MediaDatabaseShape;
  const songs = snapshot.releaseRecords.filter((song) => song.status === "published" && song.publicationState === "published");
  const totals = new Map<string, { tierKey: string; accounts: number; permittedSongStreams: number; permittedSongDownloads: number }>();
  for (const member of snapshot.memberAccounts) {
    const tierKey = resolveMemberEntitlements(snapshot, member.memberId).tierKey;
    const total = totals.get(tierKey) ?? { tierKey, accounts: 0, permittedSongStreams: 0, permittedSongDownloads: 0 };
    total.accounts++;
    for (const song of songs) {
      if (evaluateSongAction(snapshot, member.memberId, song.releaseId, "stream").allowed) total.permittedSongStreams++;
      if (evaluateSongAction(snapshot, member.memberId, song.releaseId, "download").allowed) total.permittedSongDownloads++;
    }
    totals.set(tierKey, total);
  }
  const mediaIds = songs.map((song) => song.metadata?.fullSongAssetId).filter((id): id is string => typeof id === "string");
  const objects = await db.collection("media_storage_objects").find({ assetId: { $in: mediaIds } }, { projection: { _id: 0, assetId: 1, accessLevel: 1, status: 1, publicUrl: 1, mimeType: 1, mediaCategory: 1, assetType: 1, provider: 1, storagePath: 1 } }).toArray();
  const readyPrivate = new Set(objects.filter((object) => ["private", "signed", "admin_only"].includes(object.accessLevel) && ["ready", "uploaded"].includes(object.status) && !object.publicUrl).map((object) => object.assetId));
  const publicFullSongRecords = objects.filter((object) => object.accessLevel === "public" || object.publicUrl).length;
  const publicGroups = new Map<string, number>();
  for (const object of objects.filter((item) => item.accessLevel === "public" || item.publicUrl)) {
    const label = JSON.stringify({ status: object.status, mimeType: object.mimeType, category: object.mediaCategory, type: object.assetType, provider: object.provider, hasPublicUrl: Boolean(object.publicUrl), privatePrefix: String(object.storagePath ?? "").startsWith("private/") });
    publicGroups.set(label, (publicGroups.get(label) ?? 0) + 1);
  }
  const accountStates = new Map<string, number>();
  for (const member of snapshot.memberAccounts) { const key = `${member.status}:${member.emailVerified === true ? "verified" : "unverified"}`; accountStates.set(key, (accountStates.get(key) ?? 0) + 1); }
  const assignmentDiagnostics = { membersWithoutCurrentAssignment: 0, membersWithOneCurrentAssignment: 0, membersWithMultipleCurrentAssignments: 0, unknownTierReferences: 0, invalidAssignmentDates: 0 };
  for (const member of snapshot.memberAccounts) {
    const current = snapshot.memberMembershipAssignments.filter((item) => item.memberId === member.memberId && item.status === "active" && Date.parse(item.startsAt) <= Date.now() && (!item.endsAt || Date.parse(item.endsAt) > Date.now()));
    if (!current.length) assignmentDiagnostics.membersWithoutCurrentAssignment++; else if (current.length === 1) assignmentDiagnostics.membersWithOneCurrentAssignment++; else assignmentDiagnostics.membersWithMultipleCurrentAssignments++;
  }
  assignmentDiagnostics.unknownTierReferences = snapshot.memberMembershipAssignments.filter((item) => !snapshot.membershipTiers.some((tier) => tier.tierId === item.tierId)).length;
  assignmentDiagnostics.invalidAssignmentDates = snapshot.memberMembershipAssignments.filter((item) => !Number.isFinite(Date.parse(item.startsAt)) || (item.endsAt != null && !Number.isFinite(Date.parse(item.endsAt)))).length;
  const publicProbeStatuses: Record<string, number> = {};
  if (process.argv.includes("--probe-public-head")) for (const object of objects.filter((item) => item.accessLevel === "public" || item.publicUrl)) {
    try {
      const target = new URL(object.publicUrl);
      if (target.protocol !== "https:" || target.hostname !== "staging-media.ascendnexusmedia.com") { publicProbeStatuses.unapproved_host_not_probed = (publicProbeStatuses.unapproved_host_not_probed ?? 0) + 1; continue; }
      const response = await fetch(target, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(15000) });
      const key = `${response.status}:${response.headers.get("content-type")?.startsWith("audio/") ? "audio" : "other"}`;
      publicProbeStatuses[key] = (publicProbeStatuses[key] ?? 0) + 1;
    } catch { publicProbeStatuses.unavailable = (publicProbeStatuses.unavailable ?? 0) + 1; }
  }
  console.log(JSON.stringify({ environment: "staging", auditMode: "read_only_source_evaluation_not_deployed_api_test", checkedAt: new Date().toISOString(), publishedSongs: songs.length,
    songsWithSelectedFullAudio: mediaIds.length, songsWithReadyPrivateStorageMetadata: mediaIds.filter((id) => readyPrivate.has(id)).length,
    songsMissingSelectedFullAudio: songs.length - mediaIds.length, selectedAudioWithoutReadyPrivateStorageMetadata: mediaIds.filter((id) => !readyPrivate.has(id)).length,
    publicFullSongStorageRecords: publicFullSongRecords, flaggedStorageGroups: [...publicGroups.entries()].map(([group, count]) => ({ ...JSON.parse(group), count })), accountStates: Object.fromEntries(accountStates), tierDefinitions: snapshot.membershipTiers.map((tier) => ({ tierKey: tier.tierKey, status: tier.status })), activeDefinitions: snapshot.entitlementDefinitions.filter((item) => item.status === "active").length, membershipAssignments: snapshot.memberMembershipAssignments.length, memberAccess: [...totals.values()].sort((a, b) => a.tierKey.localeCompare(b.tierKey)),
    assignmentDiagnostics, publicProbeStatuses, mediaBytesVerified: false, databaseMutated: false }));
  if (publicFullSongRecords) process.exitCode = 1;
} catch { console.error("Staging song permission audit could not complete. No account or media data was printed or modified."); process.exitCode = 1; }
finally { await client.close(); }
