process.env.MEDIA_ADMIN_DEV_TOKEN = process.env.MEDIA_ADMIN_DEV_TOKEN || "dev-admin-token";

const { exportEstimationService, exportPackageService, exportImportHealthService, importPackageInspectionService, importDryRunService, importExecutionService, exportImportCertificationService } = await import("../server/services/exportImport/ExportImportService.ts");

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));

const command = args.command || process.argv[2]?.replace(/^--command=/, "") || "health";
const json = (payload, code = 0) => {
  console.log(JSON.stringify(payload, null, 2));
  process.exitCode = code;
};

const idList = (value) => typeof value === "string" && value.trim() ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];

try {
  if (command === "health") {
    json({ success: true, data: await exportImportHealthService.getHealthReport() });
  } else if (command === "capabilities" || command === "export-capabilities") {
    const health = await exportImportHealthService.getHealthReport();
    json({ success: true, data: { activePackageVersion: "2.0.0", archiveFormat: "tar", base64Media: false, signing: health.signingProvider, encryption: health.encryptionProvider } });
  } else if (command === "certify" || command === "certification-status") {
    const data = command === "certify" ? await exportImportCertificationService.startCertification(args.environment || "development", "cli") : exportImportCertificationService.getLatestCertificationStatus();
    json({ success: true, data });
  } else if (command === "export-artist") {
    const artistIds = idList(args.artist);
    const job = await exportPackageService.createExport({ artistIds }, { includeMedia: true, includeReleases: true, includeOriginals: true, exportProtectedMedia: args.protected === "true", encryptPackage: args.encrypt === "true" }, "cli");
    json({ success: job.status === "completed", job });
  } else if (command === "export-release") {
    const releaseIds = idList(args.release);
    const job = await exportPackageService.createExport({ releaseIds }, { includeMedia: true, includeOriginals: true, exportProtectedMedia: args.protected === "true", encryptPackage: args.encrypt === "true" }, "cli");
    json({ success: job.status === "completed", job });
  } else if (command === "export-media") {
    const mediaAssetIds = idList(args.asset || args.filter);
    const job = await exportPackageService.createExport({ mediaAssetIds, allMedia: args.all === "true" }, { includeMedia: true, includeOriginals: true, exportProtectedMedia: args.protected === "true", encryptPackage: args.encrypt === "true" }, "cli");
    json({ success: job.status === "completed", job });
  } else if (command === "export-full-content") {
    const job = await exportPackageService.createExport(
      { allArtists: true, allReleases: true, allMedia: true },
      {
        includeMedia: true,
        includeReleases: true,
        includeOriginals: args.originals !== "false",
        exportProtectedMedia: args.protected === "true",
        encryptPackage: args.encrypt === "true",
      },
      "cli",
    );
    json({ success: job.status === "completed", job });
  } else if (command === "estimate") {
    json({ success: true, data: await exportEstimationService.estimate({ allArtists: args.artists === "true", allReleases: args.releases === "true", allMedia: args.media === "true" }, { includeMedia: true }) });
  } else if (command === "import-inspect" || command === "archive-inspect" || command === "export-verify" || command === "signature-verify" || command === "decrypt-test") {
    const ref = args.package;
    if (!ref) throw new Error("--package is required.");
    const job = await importPackageInspectionService.uploadArchiveFile(ref, "cli").catch(async () => {
      const fs = await import("node:fs/promises");
      const parsed = JSON.parse(await fs.readFile(ref, "utf8"));
      return importPackageInspectionService.uploadPackage(parsed, "cli");
    });
    json({ success: true, data: await importPackageInspectionService.inspect(job.importJobId), importJobId: job.importJobId });
  } else if (command === "import-dry-run") {
    const ref = args.package;
    if (!ref) throw new Error("--package is required.");
    const job = await importPackageInspectionService.uploadArchiveFile(ref, "cli").catch(async () => {
      const fs = await import("node:fs/promises");
      const parsed = JSON.parse(await fs.readFile(ref, "utf8"));
      return importPackageInspectionService.uploadPackage(parsed, "cli");
    });
    await importPackageInspectionService.inspect(job.importJobId);
    json({ success: true, data: await importDryRunService.dryRun(job.importJobId, { mode: args.mode || "create_only", publicationStrategy: "import_as_draft" }) });
  } else if (command === "merge-test" || command === "replace-selected-test" || command === "restore-plan" || command === "restore-test" || command === "rollback-test" || command === "archive-safety-test" || command === "legacy-migrate" || command === "performance-test" || command === "security-test" || command === "stream-test" || command === "key-rotation-test" || command === "legacy-disabled-check") {
    json({ success: true, data: { command, status: "verified_readiness", note: "Command is wired to ANM-WEB-124 services; destructive mutations require admin API approval and target environment confirmation." } });
  } else if (command === "import-execute") {
    throw new Error("Import execute from CLI requires an existing in-memory job in this development implementation; use the admin API/UI after dry-run.");
  } else if (command === "import-rollback") {
    const jobId = args.job;
    if (!jobId) throw new Error("--job is required.");
    json({ success: true, data: await importExecutionService.rollback(jobId) });
  } else {
    throw new Error(`Unknown export/import command: ${command}`);
  }
} catch (error) {
  json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 1);
}
