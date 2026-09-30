process.env.MEDIA_API_PORT = process.env.MEDIA_API_PORT || "5325";
process.env.MEDIA_API_HOST = process.env.MEDIA_API_HOST || "127.0.0.1";
process.env.MEDIA_ADMIN_DEV_TOKEN = process.env.MEDIA_ADMIN_DEV_TOKEN || "dev-admin-token";

const { createMediaApiServer } = await import("../server/index.ts");

const token = process.env.MEDIA_ADMIN_DEV_TOKEN;
const port = process.env.MEDIA_API_PORT;
const host = process.env.MEDIA_API_HOST;
const base = `http://${host}:${port}`;
const server = createMediaApiServer();

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
};

const assertPublicSafe = (payload, label) => {
  const serialized = JSON.stringify(payload);
  for (const unsafe of ["private/", "signed", "token=", "blob:", "secret", "accessKey"]) {
    if (serialized.includes(unsafe)) throw new Error(`${label} exposed unsafe public configuration data: ${unsafe}`);
  }
};

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(port), host, resolve);
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const firstSiteName = `Ascend Nexus Smoke ${suffix}`;
  const secondSiteName = `Ascend Nexus Smoke Updated ${suffix}`;
  const heroSectionId = `hero-${suffix}`;
  const disabledSectionId = `disabled-${suffix}`;
  const customSectionId = `custom-${suffix}`;

  const initial = await request("/api/admin/site-settings");
  if (!initial.response.ok || !initial.json.siteConfig?.homepageSections) throw new Error(`Site draft bootstrap failed: ${JSON.stringify(initial.json)}`);

  const firstSections = [
    {
      sectionId: heroSectionId,
      sectionType: "hero",
      enabled: true,
      sortOrder: 10,
      title: "Smoke Hero",
      subtitle: "Published from a persisted draft.",
      configuration: {
        headline: "Smoke Hero",
        subheadline: "Published from a persisted draft.",
        primaryCtaLabel: "Browse releases",
        primaryCtaUrl: "/songs",
      },
    },
    {
      sectionId: disabledSectionId,
      sectionType: "about",
      enabled: false,
      sortOrder: 20,
      title: "Disabled Section",
      configuration: { body: "This section should not render publicly." },
    },
    {
      sectionId: customSectionId,
      sectionType: "custom",
      enabled: true,
      sortOrder: 30,
      title: "Smoke Custom",
      configuration: { body: "Custom text survives publication." },
    },
  ];

  const update = await request("/api/admin/site-settings", {
    method: "PATCH",
    body: JSON.stringify({
      siteName: firstSiteName,
      siteDescription: "Smoke verified persisted public site configuration.",
      homepageSections: firstSections,
      navigationLinks: [
        { label: "Home", href: "/", enabled: true, sortOrder: 10 },
        { label: "Artists", href: "/artists", enabled: true, sortOrder: 20 },
        { label: "Songs", href: "/songs", enabled: true, sortOrder: 30 },
      ],
      footerLinks: [
        { label: "Privacy", href: "/privacy", enabled: true, sortOrder: 10 },
        { label: "Terms", href: "/terms", enabled: true, sortOrder: 20 },
      ],
      socialLinks: { website: "https://example.com" },
      contactEmail: "hello@example.com",
      newsletterEnabled: false,
      contactPageEnabled: true,
    }),
  });
  if (!update.response.ok || update.json.siteConfig?.siteName !== firstSiteName) throw new Error(`Site draft update failed: ${JSON.stringify(update.json)}`);

  const readiness = await request("/api/admin/site-settings/draft/current/readiness");
  if (!readiness.response.ok || readiness.json.readiness?.ready !== true) throw new Error(`Site readiness failed: ${JSON.stringify(readiness.json)}`);

  const publish = await request("/api/admin/site-settings/draft/current/publish", { method: "POST", body: "{}" });
  if (!publish.response.ok || publish.json.siteConfig?.siteName !== firstSiteName) throw new Error(`Site publish failed: ${JSON.stringify(publish.json)}`);
  const firstPublishedVersion = publish.json.siteConfig?.metadata?.siteVersion;
  if (!Number.isFinite(firstPublishedVersion)) throw new Error(`Published site response did not include version metadata: ${JSON.stringify(publish.json)}`);

  const publicSite = await fetch(`${base}/api/public/site`);
  const publicSiteJson = await publicSite.json();
  if (!publicSite.ok || publicSiteJson.data?.siteName !== firstSiteName) throw new Error(`Public site did not reflect published config: ${JSON.stringify(publicSiteJson)}`);
  assertPublicSafe(publicSiteJson, "Public site");

  const publicHomepage = await fetch(`${base}/api/public/homepage`);
  const publicHomepageJson = await publicHomepage.json();
  const publicSections = publicHomepageJson.data?.sections ?? [];
  if (!publicHomepage.ok || !publicSections.some((section) => section.sectionId === heroSectionId)) {
    throw new Error(`Public homepage did not include published hero section: ${JSON.stringify(publicHomepageJson)}`);
  }
  if (publicSections.some((section) => section.sectionId === disabledSectionId)) {
    throw new Error("Disabled homepage section was exposed publicly.");
  }
  assertPublicSafe(publicHomepageJson, "Public homepage");

  const reorder = await request("/api/admin/homepage/draft/current", {
    method: "PATCH",
    body: JSON.stringify({
      sections: [
        { ...firstSections[2], sortOrder: 10 },
        { ...firstSections[0], sortOrder: 20 },
        { ...firstSections[1], sortOrder: 30 },
      ],
    }),
  });
  if (!reorder.response.ok) throw new Error(`Homepage reorder draft update failed: ${JSON.stringify(reorder.json)}`);

  const secondUpdate = await request("/api/admin/site-settings", {
    method: "PATCH",
    body: JSON.stringify({ siteName: secondSiteName }),
  });
  if (!secondUpdate.response.ok || secondUpdate.json.siteConfig?.siteName !== secondSiteName) throw new Error(`Second site draft update failed: ${JSON.stringify(secondUpdate.json)}`);

  const secondPublish = await request("/api/admin/site-settings/draft/current/publish", { method: "POST", body: "{}" });
  if (!secondPublish.response.ok || secondPublish.json.siteConfig?.siteName !== secondSiteName) throw new Error(`Second site publish failed: ${JSON.stringify(secondPublish.json)}`);

  const versions = await request("/api/admin/site-settings/versions");
  const rollbackCandidate = versions.json.versions?.find((version) => version.version === firstPublishedVersion);
  if (!versions.response.ok || !rollbackCandidate) throw new Error(`Version history did not retain rollback candidate: ${JSON.stringify(versions.json)}`);

  const rollback = await request(`/api/admin/site-settings/versions/${rollbackCandidate.version}/rollback`, { method: "POST", body: "{}" });
  if (!rollback.response.ok || rollback.json.siteConfig?.siteName !== firstSiteName) throw new Error(`Rollback failed: ${JSON.stringify(rollback.json)}`);

  const rolledBackPublicSite = await fetch(`${base}/api/public/site`);
  const rolledBackJson = await rolledBackPublicSite.json();
  if (!rolledBackPublicSite.ok || rolledBackJson.data?.siteName !== firstSiteName) {
    throw new Error(`Public site did not reflect rollback: ${JSON.stringify(rolledBackJson)}`);
  }

  console.log(JSON.stringify({
    success: true,
    firstSiteName,
    secondSiteName,
    disabledSectionHidden: true,
    publicSafePayloads: true,
    rollbackRestoredVersion: rollbackCandidate.version,
    publicSiteRolledBack: true,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
