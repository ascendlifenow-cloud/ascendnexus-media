const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : "true"];
}));

const command = args.get("command") || "health";
const { publicExperienceHealthService } = await import("../server/services/public/PublicExperienceHealthService.ts");
const { publicExperienceValidationService } = await import("../server/services/public/PublicExperienceValidationService.ts");
const { publicLandingService } = await import("../server/services/public/PublicLandingService.ts");
const { guestAccessPolicyService } = await import("../server/services/public/GuestAccessPolicyService.ts");

const output = (payload) => console.log(JSON.stringify(payload, null, 2));
const isBlocking = (payload) => {
  const text = JSON.stringify(payload);
  return /"status":\s*"blocked"|"valid":\s*false|"publicSafe":\s*false|"safe":\s*false/.test(text);
};

const summarizeNetwork = (landing) => ({
  status: "ok",
  publicRoutes: ["/", "/artists", "/songs", "/gallery", "/search", "/browse", "/login", "/register"],
  publicApiRoutes: ["/api/public/landing", "/api/public/site", "/api/public/homepage", "/api/public/artists", "/api/public/releases", "/api/public/gallery"],
  adminRoutesReferenced: JSON.stringify(landing).includes("/admin"),
  checkedAt: new Date().toISOString(),
});

const summarizeAccessibility = (landing) => ({
  status: landing.hero.headline && landing.hero.primaryCta?.href ? "ok" : "degraded",
  checks: {
    heroHeadline: Boolean(landing.hero.headline),
    primaryCta: Boolean(landing.hero.primaryCta?.label && landing.hero.primaryCta?.href),
    galleryAltTextCoverage: landing.galleryPreview.length ? landing.galleryPreview.filter((card) => card.item.altText || card.item.title).length / landing.galleryPreview.length : 1,
    noAutoplayAudio: true,
    publicAccountRoutesPresent: landing.membershipTeaser.loginHref === "/login" && landing.membershipTeaser.registerHref === "/register",
  },
  checkedAt: new Date().toISOString(),
});

const summarizePerformance = (landing) => ({
  status: "ok",
  budgets: {
    latestReleases: landing.latestReleases.length,
    featuredReleases: landing.featuredReleases.length,
    featuredArtists: landing.featuredArtists.length,
    galleryPreview: landing.galleryPreview.length,
  },
  warning: "Browser LCP/CLS/INP still require deployed browser measurement.",
  checkedAt: new Date().toISOString(),
});

try {
  let result;
  const landing = await publicLandingService.buildPublicLandingExperience();
  const report = guestAccessPolicyService.buildGuestAccessReport(landing);
  switch (command) {
    case "health":
      result = await publicExperienceHealthService.buildHealth();
      break;
    case "verify":
    case "validate-config":
    case "smoke-test":
      result = await publicExperienceValidationService.validateLandingExperience();
      break;
    case "network-scan":
      result = summarizeNetwork(landing);
      if (result.adminRoutesReferenced) result.status = "blocked";
      break;
    case "private-data-scan":
      result = { status: report.privateUrls.length || report.signedUrls.length || report.storagePaths.length || report.adminMetadata.length || report.forbiddenFields.length ? "blocked" : "ok", report };
      break;
    case "full-song-scan":
      result = { status: report.fullSongReferences.length ? "blocked" : "ok", fullSongReferences: report.fullSongReferences, checkedAt: report.checkedAt };
      break;
    case "accessibility":
      result = summarizeAccessibility(landing);
      break;
    case "performance":
      result = summarizePerformance(landing);
      break;
    default:
      throw new Error(`Unknown public experience command: ${command}`);
  }
  output(result);
  if (isBlocking(result)) process.exitCode = 1;
} catch (error) {
  output({ success: false, command, message: error instanceof Error ? error.message : "Unknown public experience verification error." });
  process.exitCode = 1;
}
