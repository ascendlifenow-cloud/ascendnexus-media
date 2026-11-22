import assert from "node:assert/strict";
import { consumerStyleTags } from "../src/utils/consumerStyleTags";
import { getFooterExternalLinks } from "../src/components/layout/footerUtils";
import { mapReleaseRecordToPublicSongRelease } from "../server/mappers/public/mapReleaseRecordToPublicSongRelease";
import type { PublicSongRelease } from "../src/models/release";

const tags = [" recovered ", "MEDIA_INTAKE", "Draft", "archived", "Dream Pop", "dream pop", "Soulful", "", 42];
assert.deepEqual(consumerStyleTags(tags), ["Dream Pop", "Soulful"]);
assert.equal(tags.length, 9, "Filtering must not mutate the admin record");
for (const invalid of [null, undefined, {}, "Rock"]) assert.deepEqual(consumerStyleTags(invalid), []);
assert.deepEqual(consumerStyleTags(["Recovery", "Raw", "Draft Punk", "Archival folk"]), ["Recovery", "Raw", "Draft Punk", "Archival folk"]);
const release = { releaseId: "fixture", status: "published", coverArtUrl: "https://cdn.example.org/cover.png", styleTags: tags } as unknown as PublicSongRelease;
assert.deepEqual(mapReleaseRecordToPublicSongRelease(release)?.styleTags, ["Dream Pop", "Soulful"]);
assert.equal(mapReleaseRecordToPublicSongRelease({ ...release, status: "draft" }), null);
const links = ["https://example.com/", "https://sub.example.org/path", "https://example.net", "not a url", "javascript:alert(1)", "https://ascendnexusmedia.com/"].map(href => ({ platform: "website", label: "Website", href }));
assert.deepEqual(getFooterExternalLinks(links).map(link => link.url), ["https://ascendnexusmedia.com/"]);
assert.equal(getFooterExternalLinks([{ ...links[5], enabled: false }]).length, 0);
console.log("Consumer discovery tests passed: explicit workflow labels excluded, real styles preserved, published projection enforced and placeholder footer destinations excluded.");
