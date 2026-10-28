import assert from "node:assert/strict";
import { isKnownTestMediaFixture, referencesAny } from "../server/services/media/TestMediaFixturePolicy";
for (const title of ["Backend Smoke Cover", "Publication Smoke Cover", "Processing Smoke", "Real Processing Smoke", "DebugCoverArtLanRestarted", "Smoke Full Song 1783725555209-hzljs", "Release Cover Picker Smoke"]) assert.equal(isKnownTestMediaFixture({ title }), true);
for (const title of ["Smoke and Mirrors", "The Test of Time", "Latest Song", "Smoke Cover", "", "Debug My Heart"]) assert.equal(isKnownTestMediaFixture({ title }), false);
assert.equal(referencesAny({ metadata: { assets: ["test-asset"] } }, new Set(["test-asset"])), true);
assert.equal(referencesAny({ title: "test-asset song" }, new Set(["test-asset"])), false);
console.log("Test media fixture policy: 15 checks passed.");
