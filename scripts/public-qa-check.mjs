import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const walk = (dir) => {
  const fullDir = join(root, dir);
  return readdirSync(fullDir).flatMap((entry) => {
    const fullPath = join(fullDir, entry);
    const relPath = relative(root, fullPath);
    if (entry === "node_modules" || entry === "dist" || entry === ".git") return [];
    if (statSync(fullPath).isDirectory()) return walk(relPath);
    return relPath;
  });
};

const sourceFiles = walk("src").filter((file) => /\.(ts|tsx)$/.test(file));
const appRouter = read("src/routes/AppRouter.tsx");
const packageJson = JSON.parse(read("package.json"));

const requiredRoutes = [
  'path="/"',
  'path="/artists"',
  'path="/artists/:artistSlug"',
  'path="/songs/:songSlug"',
  'path="/songs"',
  'path="/search"',
  'path="/browse"',
  'path="/gallery"',
  'path="/contact"',
  'path="*"',
];

requiredRoutes.forEach((route) => {
  assert(appRouter.includes(route), `Missing route in AppRouter: ${route}`);
});

assert(appRouter.includes('path="/releases"'), "Missing optional /releases route alias");
assert(appRouter.includes("<ResponsiveHeader />"), "ResponsiveHeader is not mounted in AppRouter");
assert(appRouter.includes("<ResponsiveFooter />"), "ResponsiveFooter is not mounted in AppRouter");
assert(appRouter.includes("<Suspense"), "Route-level Suspense is not configured");

const publicUiFiles = sourceFiles.filter((file) => file.startsWith("src/components/") || file.startsWith("src/pages/"));
const directSeedImports = publicUiFiles.filter((file) => /publicArtists\.seed|publicSongReleases\.seed|publicExternalLinks\.seed|homepageSections\.config/.test(read(file)));
assert(directSeedImports.length === 0, `Public UI imports seed/config files directly: ${directSeedImports.join(", ")}`);

const appSource = sourceFiles.map((file) => read(file)).join("\n");
assert(!/preload="metadata"/.test(appSource), "Audio preview metadata preloading is still present");
assert(!/\.load\(\)/.test(appSource), "Forced media load() call is still present");
assert(/protocol === "https:" \|\| parsedUrl\.protocol === "mailto:"/.test(read("src/utils/externalLinksUtils.ts")), "External URL protocol allowlist changed or is missing");
assert(/noIndex: true/.test(read("src/utils/seoMetadata.ts")), "SEO noIndex readiness is missing from metadata utilities");
assert(/provider: isDevelopment \? "console" : "none"/.test(read("src/utils/analytics/analyticsUtils.ts")), "Analytics default provider is not development-console/production-none");

assert(Boolean(packageJson.scripts?.typecheck), "Missing npm run typecheck script");
assert(Boolean(packageJson.scripts?.build), "Missing npm run build script");
assert(Boolean(packageJson.scripts?.["qa:public"]), "Missing npm run qa:public script");
assert(existsSync(join(root, "docs/ANM-WEB-033-production-readiness-report.md")), "Production readiness QA report is missing");

if (failures.length) {
  console.error("Public QA check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Public QA structural checks passed.");
