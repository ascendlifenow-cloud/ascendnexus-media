import assert from "node:assert/strict";
import { catalogEntityId, hasLiveCatalogReference } from "../server/services/media/CatalogReferencePolicy";
const release = { releaseId: "release-1", artistId: "artist-1" };
assert.equal(catalogEntityId(release, "release"), "release-1");
assert.equal(catalogEntityId(release, "artist"), "artist-1");
assert.equal(hasLiveCatalogReference({ metadata: { previousCoverArtAssetIds: ["old"] } }, new Set(["old"])), false);
assert.equal(hasLiveCatalogReference({ metadata: { previousCoverArtAssetIds: ["old"], coverArtAssetId: "old" } }, new Set(["old"])), true);
assert.equal(hasLiveCatalogReference({ metadata: { mediaAssetId: "old" } }, new Set(["old"])), true);
console.log("Catalog reference policy: 5 checks passed.");
