import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = await mkdtemp(join(tmpdir(), "anmx-playlist-test-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_STORAGE_PROVIDER: "local", MEDIA_STORAGE_LOCAL_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
try {
  const { playlistService } = await import("../server/services/memberEngagement/MemberEngagementServices");
  const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
  const owner = { memberId: "owner" } as never;
  const other = { memberId: "other" } as never;
  const playlist = await playlistService.create(owner, { name: "Synthetic Mix" });
  assert.ok(playlist);
  const song = { resourceType: "release" as const, resourceId: "song", title: "Synthetic Song" };
  await Promise.all([playlistService.addItem(owner, playlist.playlistId, song), playlistService.addItem(owner, playlist.playlistId, song)]);
  await playlistService.addItem(owner, playlist.playlistId, song);
  assert.equal((await playlistService.list(owner))[0].items.length, 1, "Retries must not duplicate a song");
  await assert.rejects(() => playlistService.addItem(other, playlist.playlistId, { ...song, resourceId: "another" }), /not found/);
  assert.equal((await playlistService.list(other)).length, 0);
  await playlistService.addItem(owner, playlist.playlistId, { ...song, resourceId: "another" });
  const items = (await playlistService.list(owner))[0].items;
  assert.deepEqual(items.map(item => item.position), [1, 2]);
  assert.equal((await jsonDatabase.read()).memberPlaylistItems.length, 2);
  console.log("Playlist idempotency passed: concurrent/repeated adds, stable order and cross-member rejection in isolated local storage. Distributed Mongo races are not certified by this test.");
} finally { await rm(root, { recursive: true, force: true }); }
