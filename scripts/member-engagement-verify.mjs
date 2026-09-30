import { randomUUID } from "node:crypto";
import { createMediaApiServer } from "../server/index.ts";
import { jsonDatabase } from "../server/services/media/JsonDatabase.ts";

const command = process.argv.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "verify";
const failures = [];
const marker = `member-engagement-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const safePrint = (payload) => console.log(JSON.stringify(payload, (key, value) => {
  if (key.toLowerCase().includes("email")) return "[REDACTED]";
  if (typeof value === "string" && /(token=|signature=|x-amz-|private\/|storagePath|signedUrl|full[-_]?song|authorizationReference|streamEndpoint|downloadUrl)/i.test(value)) return "[REDACTED]";
  return value;
}, 2));

const withServer = async (fn) => {
  const server = createMediaApiServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const jsonRequest = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Auth-Scope": "member", ...(options.headers ?? {}) },
  });
  return { response, payload: await response.json().catch(() => ({})) };
};

const cleanup = async () => {
  await jsonDatabase.update((data) => {
    const ids = new Set(data.memberAccounts.filter((member) => member.memberId.includes("member-engagement-smoke") || member.normalizedEmail.includes("member-engagement-smoke")).map((member) => member.memberId));
    data.memberAccounts = data.memberAccounts.filter((member) => !ids.has(member.memberId));
    data.memberSessions = data.memberSessions.filter((session) => !ids.has(session.memberId));
    data.memberVerificationTokens = data.memberVerificationTokens.filter((token) => !ids.has(token.memberId));
    data.memberPasswordResetTokens = data.memberPasswordResetTokens.filter((token) => !ids.has(token.memberId));
    data.memberMembershipAssignments = data.memberMembershipAssignments.filter((assignment) => !ids.has(assignment.memberId));
    data.memberFavorites = data.memberFavorites.filter((item) => !ids.has(item.memberId));
    data.memberFollows = data.memberFollows.filter((item) => !ids.has(item.memberId));
    data.memberPlaylists = data.memberPlaylists.filter((item) => !ids.has(item.memberId));
    data.memberPlaylistItems = data.memberPlaylistItems.filter((item) => !ids.has(item.memberId));
    data.memberPlaybackHistory = data.memberPlaybackHistory.filter((item) => !ids.has(item.memberId));
    data.memberViewingHistory = data.memberViewingHistory.filter((item) => !ids.has(item.memberId));
    data.memberNotifications = data.memberNotifications.filter((item) => !ids.has(item.memberId));
    data.memberRecommendationFeedback = data.memberRecommendationFeedback.filter((item) => !ids.has(item.memberId));
    data.memberSavedSearches = data.memberSavedSearches.filter((item) => !ids.has(item.memberId));
    data.memberCollections = data.memberCollections.filter((item) => !ids.has(item.memberId));
    data.memberCollectionItems = data.memberCollectionItems.filter((item) => !ids.has(item.memberId));
  });
};

const prepareMember = async (baseUrl, suffix) => {
  const email = `${marker}-${suffix}@example.invalid`;
  const password = "MemberEngagementSmoke123!";
  const registration = await jsonRequest(baseUrl, "/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, displayName: `Engagement Smoke ${suffix}`, acceptTerms: true, acceptPrivacy: true }) });
  expect(registration.response.status === 201, `Registration failed for ${suffix}: ${registration.response.status}`);
  await jsonRequest(baseUrl, "/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: registration.payload.data?.verificationToken }) });
  const login = await jsonRequest(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  expect(login.response.ok, `Login failed for ${suffix}: ${login.response.status}`);
  return { cookie: login.response.headers.get("set-cookie"), memberId: login.payload.data?.member?.memberId };
};

const noLeak = (payload, label) => {
  expect(!JSON.stringify(payload).match(/private\/|storagePath|privateObjectKey|signedUrl|signature=|fullSong|full-song|full_song|authorizationReference|streamEndpoint|downloadUrl/i), `${label} leaked protected data.`);
};

const runVerify = async () => withServer(async (baseUrl) => {
  await cleanup();
  const memberA = await prepareMember(baseUrl, "a");
  const memberB = await prepareMember(baseUrl, "b");
  const headersA = { Cookie: memberA.cookie ?? "" };
  const headersB = { Cookie: memberB.cookie ?? "" };
  try {
    const resource = { resourceType: "release", resourceId: `${marker}-release`, title: "Smoke Release", slug: "smoke-release" };
    const favorite = await jsonRequest(baseUrl, "/api/member/favorites", { method: "POST", headers: headersA, body: JSON.stringify(resource) });
    expect(favorite.response.status === 201, "Favorite add failed.");
    const follow = await jsonRequest(baseUrl, "/api/member/following", { method: "POST", headers: headersA, body: JSON.stringify({ ...resource, resourceType: "artist", resourceId: `${marker}-artist`, title: "Smoke Artist" }) });
    expect(follow.response.status === 201, "Follow failed.");
    const playlist = await jsonRequest(baseUrl, "/api/member/playlists", { method: "POST", headers: headersA, body: JSON.stringify({ name: "Smoke Playlist" }) });
    expect(playlist.response.status === 201, "Playlist create failed.");
    const playlistId = playlist.payload.data?.playlistId;
    const playlistItem = await jsonRequest(baseUrl, `/api/member/playlists/${encodeURIComponent(playlistId)}/items`, { method: "POST", headers: headersA, body: JSON.stringify(resource) });
    expect(playlistItem.response.status === 201, "Playlist item add failed.");
    const history = await jsonRequest(baseUrl, "/api/member/history", { method: "POST", headers: headersA, body: JSON.stringify({ ...resource, eventType: "played", lastPositionSeconds: 42, durationSeconds: 180 }) });
    expect(history.response.status === 201, "History record failed.");
    const notification = await jsonRequest(baseUrl, "/api/member/notifications", { method: "POST", headers: headersA, body: JSON.stringify({ title: "Smoke notification", body: "In-app notification", resource }) });
    expect(notification.response.status === 201, "Notification create failed.");
    const feedback = await jsonRequest(baseUrl, "/api/member/recommendation-feedback", { method: "POST", headers: headersA, body: JSON.stringify({ ...resource, action: "liked" }) });
    expect(feedback.response.status === 201, "Recommendation feedback failed.");
    const saved = await jsonRequest(baseUrl, "/api/member/saved-searches", { method: "POST", headers: headersA, body: JSON.stringify({ name: "Smoke Search", query: "smoke" }) });
    expect(saved.response.status === 201, "Saved search failed.");
    const collection = await jsonRequest(baseUrl, "/api/member/collections", { method: "POST", headers: headersA, body: JSON.stringify({ name: "Smoke Collection" }) });
    expect(collection.response.status === 201, "Collection create failed.");
    const collectionId = collection.payload.data?.collectionId;
    const collectionItem = await jsonRequest(baseUrl, `/api/member/collections/${encodeURIComponent(collectionId)}/items`, { method: "POST", headers: headersA, body: JSON.stringify(resource) });
    expect(collectionItem.response.status === 201, "Collection item add failed.");
    const feed = await jsonRequest(baseUrl, "/api/member/feed", { headers: headersA });
    expect(feed.response.ok && feed.payload.data?.favoriteCount === 1, "Feed summary did not include engagement.");
    const bFavorites = await jsonRequest(baseUrl, "/api/member/favorites", { headers: headersB });
    expect(bFavorites.response.ok && bFavorites.payload.data?.length === 0, "Cross-member favorites leaked.");
    noLeak({ favorite: favorite.payload, feed: feed.payload, playlist: playlist.payload, history: history.payload }, "Engagement payload");
    return { favorite: true, follow: true, playlists: 1, history: true, notification: true, feedback: true, savedSearch: true, collection: true, crossMemberSafe: true };
  } finally {
    await cleanup();
  }
});

const runHealth = async () => {
  const data = await jsonDatabase.read();
  return {
    overallStatus: "available",
    favorites: data.memberFavorites.length,
    follows: data.memberFollows.length,
    playlists: data.memberPlaylists.length,
    playbackEvents: data.memberPlaybackHistory.length,
    notifications: data.memberNotifications.length,
    checkedAt: new Date().toISOString(),
  };
};

const result = command === "health" ? await runHealth() : await runVerify();

if (failures.length) {
  safePrint({ success: false, command, failures, result });
  process.exitCode = 1;
} else {
  safePrint({ success: true, command, result });
}
