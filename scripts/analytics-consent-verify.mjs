process.env.ANALYTICS_ENABLED ??= "true";
process.env.ANALYTICS_PROVIDER ??= "none";
process.env.ANALYTICS_CONSENT_REQUIRED ??= "true";

const { createMediaApiServer } = await import("../server/index.ts");
const { jsonDatabase } = await import("../server/services/media/JsonDatabase.ts");

const server = createMediaApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

const get = async (path, headers = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const json = await response.json().catch(() => undefined);
  return { response, json };
};

const post = async (path, body, headers = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => undefined);
  return { response, json };
};

const assertNoUnsafeAnalytics = async () => {
  const data = await jsonDatabase.read();
  const serialized = JSON.stringify(data.analyticsEventRecords);
  for (const unsafe of ["person@example.com", "hello@example.com", "message body", "fullSongUrl", "signedUrl", "storagePath", "token=", "signature="]) {
    if (serialized.includes(unsafe)) throw new Error(`Unsafe analytics payload persisted: ${unsafe}`);
  }
  return data.analyticsEventRecords;
};

try {
  const policy = await get("/api/public/consent/policy");
  if (!policy.response.ok || policy.json?.data?.version !== "analytics-consent-v1") throw new Error(`Consent policy unavailable: ${JSON.stringify(policy.json)}`);

  const availability = await get("/api/public/consent/availability", { "Sec-GPC": "1" });
  if (!availability.response.ok || availability.json?.data?.gpcDetected !== true) throw new Error("GPC detection failed.");

  const rejectedBeforeConsent = await post("/api/public/analytics/events", {
    events: [{ eventName: "page_view", eventVersion: "1", route: "/search?q=hello@example.com&token=abc", properties: { routePattern: "/search" } }],
  });
  if (rejectedBeforeConsent.json?.data?.acceptedCount !== 0) throw new Error("Analytics event was accepted before consent.");

  const consent = await post("/api/public/consent", {
    source: "preference_center",
    choices: { necessary: true, analytics: true, functional: false, marketing: false },
  });
  const consentReference = consent.json?.data?.consentReference;
  if (!consent.response.ok || !consentReference) throw new Error(`Consent save failed: ${JSON.stringify(consent.json)}`);

  const accepted = await post("/api/public/analytics/events", {
    events: [
      {
        eventName: "page_view",
        eventVersion: "1",
        route: "/search?q=hello@example.com&token=abc",
        consentReference,
        properties: { routePattern: "/search", pageTitle: "Search", rawEmail: "person@example.com" },
      },
      {
        eventName: "audio_preview_started",
        eventVersion: "1",
        route: "/songs/test-song",
        consentReference,
        entity: { entityType: "release", entityId: "release_test" },
        properties: { releaseId: "release_test", artistId: "artist_test", audioUrl: "https://cdn.example/fullSongUrl.mp3", sourceContext: "verify" },
      },
      {
        eventName: "contact_form_accepted",
        eventVersion: "1",
        route: "/contact",
        consentReference,
        properties: { formLocation: "contact", result: "accepted", message: "message body" },
      },
    ],
  });
  if (accepted.json?.data?.acceptedCount !== 3) throw new Error(`Expected accepted analytics events: ${JSON.stringify(accepted.json)}`);

  const unknown = await post("/api/public/analytics/events", {
    events: [{ eventName: "totally_unknown", eventVersion: "1", route: "/", consentReference, properties: {} }],
  });
  if (unknown.json?.data?.acceptedCount !== 0 || unknown.json?.data?.rejectedCount !== 1) throw new Error("Unknown event was not rejected.");

  const withdrawn = await post("/api/public/consent/withdraw", { consentReference });
  if (!withdrawn.response.ok || withdrawn.json?.data?.status !== "withdrawn") throw new Error("Consent withdrawal failed.");

  const afterWithdrawal = await post("/api/public/analytics/events", {
    events: [{ eventName: "page_view", eventVersion: "1", route: "/", consentReference, properties: { routePattern: "/" } }],
  });
  if (afterWithdrawal.json?.data?.acceptedCount !== 0) throw new Error("Analytics event accepted after withdrawal.");

  const records = await assertNoUnsafeAnalytics();
  console.log(JSON.stringify({
    success: true,
    policyVersion: policy.json.data.version,
    gpcDetected: true,
    consentSaved: true,
    withdrawalStopsEvents: true,
    persistedAnalyticsEvents: records.length,
    unsafePayloadsExcluded: true,
    checkedAt: new Date().toISOString(),
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
