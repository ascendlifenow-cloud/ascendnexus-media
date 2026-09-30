import { getBackendConfig } from "../../config/backendConfig";
import { validateProductionStorageConfig } from "../../config/validateProductionStorageConfig";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { mediaCdnService } from "./MediaCdnService";
import { mediaStorageReconciliationService } from "./MediaStorageReconciliationService";

export interface ProductionStorageHealthReport {
  provider: string;
  configured: boolean;
  available: boolean;
  bucketAccessible: boolean;
  writeSupported: boolean;
  readSupported: boolean;
  deleteSupported: boolean;
  copySupported: boolean;
  multipartSupported: boolean;
  signedUrlsSupported: boolean;
  publicDeliveryAvailable: boolean;
  cdnAvailable: boolean;
  databaseSynchronized: boolean;
  mockDisabled: boolean;
  checkedAt: string;
  warnings: string[];
  errors: string[];
  safeDetails?: Record<string, string | number | boolean | null>;
}

export class ProductionStorageHealthService {
  async checkConfiguration() {
    return validateProductionStorageConfig();
  }

  async checkProviderConnection() {
    return backendStorageProviderRegistry.getActiveProvider().getHealthStatus();
  }

  async checkBucketAccess() {
    const health = await this.checkProviderConnection();
    return Boolean(health.available && health.bucketConfigured);
  }

  async checkWriteReadDeleteProbe() {
    return { supported: false, message: "Nondestructive write/read/delete probes require explicit staging/live provider credentials." };
  }

  async checkPublicUrlDelivery() {
    const health = await this.checkProviderConnection();
    return Boolean(health.publicUrlConfigured);
  }

  async checkSignedUrlGeneration() {
    const health = await this.checkProviderConnection();
    return Boolean(health.signedUrlsSupported);
  }

  async checkMultipartSupport() {
    const provider = backendStorageProviderRegistry.getActiveProvider();
    return Boolean(provider.supportsDirectUpload?.() && provider.createMultipartUpload && provider.createPresignedPartUploadUrl && provider.completeMultipartUpload);
  }

  async checkCopySupport() {
    return Boolean(backendStorageProviderRegistry.getActiveProvider().copyFile);
  }

  async checkCdnDelivery() {
    return mediaCdnService.getHealthStatus();
  }

  async checkDatabaseSynchronization() {
    const report = await mediaStorageReconciliationService.buildReconciliationReport();
    return report.status === "healthy";
  }

  async getFullHealthReport(): Promise<ProductionStorageHealthReport> {
    const config = getBackendConfig();
    const validation = await this.checkConfiguration();
    const providerHealth = await this.checkProviderConnection().catch((error) => ({
      provider: validation.provider,
      configured: false,
      available: false,
      bucketConfigured: false,
      publicUrlConfigured: false,
      signedUrlsSupported: false,
      deleteSupported: false,
      copySupported: false,
      multipartSupported: false,
      message: error instanceof Error ? error.message : "Provider health failed.",
      checkedAt: new Date().toISOString(),
    }));
    const reconciliation = await mediaStorageReconciliationService.buildReconciliationReport().catch(() => undefined);
    const cdn = await mediaCdnService.getHealthStatus();
    const mockDisabled = !["mock"].includes(validation.provider) && !config.storage.allowProductionMockFallback;
    const warnings = [
      ...validation.warnings,
      ...(providerHealth.available ? [] : ["Storage provider is not available in this environment."]),
      ...(cdn.warnings ?? []),
      ...(reconciliation && reconciliation.status !== "healthy" ? [`Storage reconciliation status is ${reconciliation.status}.`] : []),
    ];
    const errors = [
      ...validation.errors,
      ...validation.missingFields.map((field) => `${field} is required.`),
      ...((config.app.isProduction || config.app.isStaging) && ["local", "mock"].includes(validation.provider) ? ["Production/staging cannot use local or mock storage."] : []),
      ...((config.app.isProduction || config.app.isStaging) && config.storage.allowProductionMockFallback ? ["Production mock fallback must be disabled."] : []),
    ];
    return {
      provider: validation.provider,
      configured: validation.configured,
      available: Boolean(providerHealth.available),
      bucketAccessible: Boolean(providerHealth.bucketConfigured && providerHealth.available),
      writeSupported: Boolean(providerHealth.configured),
      readSupported: Boolean(providerHealth.available),
      deleteSupported: Boolean(providerHealth.deleteSupported),
      copySupported: Boolean(providerHealth.copySupported),
      multipartSupported: Boolean(providerHealth.multipartSupported) || await this.checkMultipartSupport().catch(() => false),
      signedUrlsSupported: Boolean(providerHealth.signedUrlsSupported),
      publicDeliveryAvailable: Boolean(providerHealth.publicUrlConfigured),
      cdnAvailable: Boolean(cdn.enabled && cdn.baseUrlConfigured),
      databaseSynchronized: reconciliation?.status === "healthy",
      mockDisabled,
      checkedAt: new Date().toISOString(),
      warnings,
      errors,
      safeDetails: {
        publicPrefixDistinct: config.storage.publicPrefix !== config.storage.privatePrefix,
        directUploadEnabled: config.uploads.directUploadEnabled,
        cdnEnabled: config.cdn.enabled,
        reconciliationStatus: reconciliation?.status ?? "unknown",
      },
    };
  }
}

export const productionStorageHealthService = new ProductionStorageHealthService();
