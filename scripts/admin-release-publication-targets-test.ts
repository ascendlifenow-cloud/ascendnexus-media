import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminReleasePublicationTargets } from "../src/admin/components/releases/form/AdminReleasePublicationTargets";
import {
  createEmptyReleaseFormState, getReleasePublicVisibilityState, mapReleaseToFormState,
  publicationAudiences, toCreateReleaseDto, toUpdateReleaseDto, validateReleaseForm,
} from "../src/admin/utils/adminReleaseFormUtils";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../src/models/admin";

// The standalone tsx runner uses the classic JSX runtime rather than Vite's automatic runtime.
Object.assign(globalThis, { React });

const base = {
  ...toCreateReleaseDto(createEmptyReleaseFormState()),
  title: "Test", slug: "test", artistId: "artist", releaseDate: "2026-01-01",
  releaseId: "test", songId: "song", createdAt: "", updatedAt: "",
} as SongReleaseAdminRecord;
const artist = { artistId: "artist", status: "active" } as ArtistAdminRecord;

for (const audience of publicationAudiences) {
  for (const homepage of [true, false]) {
    for (const newReleases of [true, false]) {
      const metadata = {
        publicationAudience: audience, publicationHomepage: homepage,
        publicationNewReleases: newReleases, customKey: "keep", waveformReady: true,
        internalNotes: "clear me",
      };
      const state = mapReleaseToFormState({ ...base, metadata });
      assert.equal(state.publicationAudience, audience);
      assert.equal(state.publicationHomepage, homepage);
      assert.equal(state.publicationNewReleases, newReleases);
      const saved = toUpdateReleaseDto({ ...state, internalNotes: "" }).metadata!;
      assert.equal(saved.publicationAudience, audience);
      assert.equal(saved.publicationHomepage, homepage);
      assert.equal(saved.publicationNewReleases, newReleases);
      assert.equal(saved.customKey, "keep");
      assert.equal(saved.waveformReady, true);
      assert.equal(saved.internalNotes, undefined);
      assert.equal(metadata.internalNotes, "clear me");
      assert.equal(validateReleaseForm(state, artist).valid, true);
      assert.equal(getReleasePublicVisibilityState({ ...state, status: "published" }, artist),
        audience === "public" ? "public" : "not_public");
      assert.equal(getReleasePublicVisibilityState(state, artist), "not_public");
      const markup = renderToStaticMarkup(createElement(AdminReleasePublicationTargets, {
        state, updateField: () => {},
      }));
      assert.ok(markup.includes("Audience &amp; Website Sections"));
      assert.ok(markup.includes("Songs catalog"));
      assert.equal((markup.match(/checked=""/g) ?? []).length, Number(homepage) + Number(newReleases));
    }
  }
}

for (const value of ["unknown", "", null, 42, true, undefined]) {
  const state = mapReleaseToFormState({ ...base, metadata: { publicationAudience: value } });
  assert.equal(state.publicationAudience, "");
  assert.equal(validateReleaseForm(state).valid, false);
  assert.ok(validateReleaseForm(state).errors.publicationAudience);
  assert.equal(toUpdateReleaseDto(state).metadata!.publicationAudience, "");
  assert.notEqual(toUpdateReleaseDto(state).metadata!.publicationAudience, "public");
  assert.equal(getReleasePublicVisibilityState({ ...state, status: "published" }, artist), "not_public");
  const corrected = { ...state, publicationAudience: "premium" as const };
  assert.equal(validateReleaseForm(corrected).valid, true);
  assert.equal(toUpdateReleaseDto(corrected).metadata!.publicationAudience, "premium");
}

for (const metadata of [undefined, {}]) {
  const state = mapReleaseToFormState({ ...base, metadata });
  assert.equal(state.publicationAudience, "public");
  assert.equal(state.publicationHomepage, true);
  assert.equal(state.publicationNewReleases, true);
}

for (const value of [null, "true", "false", 1, 0, undefined]) {
  const state = mapReleaseToFormState({ ...base, metadata: {
    publicationHomepage: value, publicationNewReleases: value,
  } });
  assert.equal(state.publicationHomepage, false);
  assert.equal(state.publicationNewReleases, false);
}

console.log("Passed: 20 publication round trips, invalid audience save regression, legacy defaults, fail-closed placements, metadata preservation, and guest visibility.");
