import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultRedactFields } from "./configRedaction";
import type { ConfigurationIssue, PublicRuntimeConfig } from "./configTypes";
import { getEnvironmentFlags, isProductionStrictMode, resolveDeploymentEnvironment, type DeploymentEnvironment } from "./environment";
import {
  envString,
  hasStrongSecret,
  isLocalUrl,
  isPlaceholderValue,
  looksLikeMongoUri,
  looksLikeRedisUri,
  parseBoolean,
  parseInteger,
  parseList,
  parseSampleRate,
  parseUrlList,
  requireHttpsUrl,
} from "./configParsers";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDir, "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")) as { version?: string; name?: string };

export type StorageProviderName = "local" | "mock" | "s3" | "r2" | "supabase" | "firebase";
export type EmailProviderName = "disabled" | "smtp" | "sendgrid" | "postmark" | "resend" | "custom";
export type AnalyticsProviderName = "none" | "google_analytics" | "plausible" | "posthog" | "custom";

export interface BackendConfig {
  app: {
    environment: DeploymentEnvironment;
    serviceName: string;
    version: string;
    commitSha?: string;
    buildTimestamp?: string;
    instanceId?: string;
    isDevelopment: boolean;
    isTest: boolean;
    isStaging: boolean;
    isProduction: boolean;
    strictMode: boolean;
  };
  server: {
    host: string;
    port: number;
    publicApiBaseUrl?: string;
    adminAppBaseUrl?: string;
    publicAppBaseUrl?: string;
    trustProxy: boolean;
    requestBodyLimit: string;
    shutdownTimeoutMs: number;
    corsAllowedOrigins: string[];
  };
  database: {
    uri?: string;
    databaseName?: string;
    connectTimeoutMs: number;
    serverSelectionTimeoutMs: number;
    maxPoolSize: number;
    minPoolSize: number;
    retryWrites: boolean;
    healthCheckEnabled: boolean;
    autoMigrate: boolean;
  };
  redis: {
    url?: string;
    prefix: string;
    connectTimeoutMs: number;
    maxRetriesPerRequest?: number;
    enableReadyCheck: boolean;
    tlsRequired: boolean;
    healthCheckEnabled: boolean;
  };
  auth: {
    enabled: boolean;
    provider: string;
    sessionSecret?: string;
    accessTokenSecret?: string;
    refreshTokenSecret?: string;
    accessTokenTtl: string;
    refreshTokenTtl: string;
    sessionTtl: string;
    cookieName: string;
    cookieDomain?: string;
    cookieSecure: boolean;
    cookieSameSite: "lax" | "strict" | "none";
    passwordMinLength: number;
    bcryptRounds: number;
    initialAdminBootstrapEnabled: boolean;
    initialAdminEmail?: string;
    passwordResetEnabled: boolean;
    legacyDevAdminToken?: string;
    authDisabled: boolean;
  };
  storage: {
    provider: StorageProviderName;
    mockEnabled: boolean;
    localEnabled: boolean;
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicBaseUrl?: string;
    publicPrefix: string;
    privatePrefix: string;
    forcePathStyle: boolean;
    signedUrlExpirationSeconds: number;
    healthCheckEnabled: boolean;
    allowProductionMockFallback: boolean;
    localRoot: string;
    dataRoot: string;
  };
  cdn: {
    enabled: boolean;
    provider: string;
    baseUrl?: string;
    imageBaseUrl?: string;
    audioBaseUrl?: string;
    cacheBustStrategy: string;
    responsiveImagesEnabled: boolean;
    invalidationEnabled: boolean;
    healthCheckEnabled: boolean;
  };
  uploads: {
    enabled: boolean;
    apiMode: string;
    maxImageBytes: number;
    maxAudioPreviewBytes: number;
    maxFullSongBytes: number;
    maxVideoBytes?: number;
    maxBatchFiles: number;
    maxBatchBytes: number;
    directUploadEnabled: boolean;
    directUploadThresholdBytes: number;
    directUploadPartSizeBytes: number;
    directUploadParallelParts: number;
    directUploadSessionExpirationSeconds: number;
    directUploadMaxParts: number;
    maxRetries: number;
    temporaryDirectory: string;
    virusScanEnabled: boolean;
    fileSignatureValidationRequired: boolean;
  };
  processing: {
    workersEnabled: boolean;
    redisRequired: boolean;
    imageConcurrency: number;
    audioConcurrency: number;
    storageConcurrency: number;
    cdnConcurrency: number;
    publicationConcurrency: number;
    maxAttempts: number;
    backoffMs: number;
    shutdownTimeoutMs: number;
    temporaryDirectory: string;
    ffmpegPath?: string;
    ffprobePath?: string;
    imageProcessingEnabled: boolean;
    audioMetadataEnabled: boolean;
    waveformEnabled: boolean;
    transcodingEnabled: boolean;
  };
  publication: {
    enabled: boolean;
    waitForRequiredProcessing: boolean;
    promoteOptionalAssets: boolean;
    runSyncVerification: boolean;
    rollbackOnRequiredFailure: boolean;
    preservePreviousPublicVersion: boolean;
    operationTimeoutMs: number;
    maxAttempts: number;
    backoffMs: number;
    lockExpirationMs: number;
  };
  email: {
    enabled: boolean;
    provider: EmailProviderName;
    apiKey?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure: boolean;
    smtpUser?: string;
    smtpPassword?: string;
    fromAddress?: string;
    fromName?: string;
    replyTo?: string;
    contactNotificationRecipients: string[];
    newsletterEnabled: boolean;
    healthCheckEnabled: boolean;
  };
  analytics: {
    enabled: boolean;
    provider: AnalyticsProviderName;
    publicMeasurementId?: string;
    apiSecret?: string;
    serverEndpoint?: string;
    trackPageViews: boolean;
    trackAudioPreview: boolean;
    trackSearch: boolean;
    trackExternalLinks: boolean;
    consentRequired: boolean;
    debug: boolean;
  };
  security: {
    helmetEnabled: boolean;
    contentSecurityPolicyEnabled: boolean;
    rateLimitEnabled: boolean;
    authRateLimitWindowMs: number;
    authRateLimitMax: number;
    publicRateLimitWindowMs: number;
    publicRateLimitMax: number;
    adminRateLimitWindowMs: number;
    adminRateLimitMax: number;
    csrfEnabled: boolean;
    signedUrlMaxExpirationSeconds: number;
    errorDetailsEnabled: boolean;
  };
  logging: {
    level: string;
    format: "json" | "pretty";
    pretty: boolean;
    redactFields: string[];
    requestLoggingEnabled: boolean;
    auditLoggingEnabled: boolean;
    destination?: string;
  };
  monitoring: {
    enabled: boolean;
    provider: string;
    dsn?: string;
    environment: DeploymentEnvironment;
    release?: string;
    sampleRate: number;
    tracesSampleRate: number;
    healthChecksEnabled: boolean;
  };
  publicDelivery: {
    apiEnabled: boolean;
    cacheEnabled: boolean;
    cacheTtlSiteSeconds: number;
    cacheTtlHomepageSeconds: number;
    cacheTtlArtistSeconds: number;
    cacheTtlReleaseSeconds: number;
    cacheTtlGallerySeconds: number;
    cacheTtlMetadataSeconds: number;
    seedFallbackEnabled: boolean;
    etagEnabled: boolean;
    healthCheckEnabled: boolean;
  };
  features: {
    adminEnabled: boolean;
    mediaUploadsEnabled: boolean;
    batchUploadsEnabled: boolean;
    directUploadsEnabled: boolean;
    mediaProcessingEnabled: boolean;
    publicationEnabled: boolean;
    publicSearchEnabled: boolean;
    publicGalleryEnabled: boolean;
    contactEnabled: boolean;
    newsletterEnabled: boolean;
    analyticsEnabled: boolean;
  };
  issues: ConfigurationIssue[];
}

const addIssue = (issues: ConfigurationIssue[], issue: Omit<ConfigurationIssue, "source"> & { source?: ConfigurationIssue["source"] }) => {
  issues.push({ source: "environment", ...issue });
};

const safeEmail = (value: string | undefined): boolean => Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
const storageProviders: StorageProviderName[] = ["local", "mock", "s3", "r2", "supabase", "firebase"];
const emailProviders: EmailProviderName[] = ["disabled", "smtp", "sendgrid", "postmark", "resend", "custom"];
const analyticsProviders: AnalyticsProviderName[] = ["none", "google_analytics", "plausible", "posthog", "custom"];

export const buildBackendConfig = (env: NodeJS.ProcessEnv = process.env): BackendConfig => {
  const issues: ConfigurationIssue[] = [];
  const environment = resolveDeploymentEnvironment(env);
  const flags = getEnvironmentFlags(environment);
  const strictMode = isProductionStrictMode(environment, env);
  const app = {
    environment,
    serviceName: envString(env, "APP_SERVICE_NAME", "ascend-nexus-media-api")!,
    version: envString(env, "APP_VERSION", packageJson.version ?? "0.0.0")!,
    commitSha: envString(env, "APP_COMMIT_SHA"),
    buildTimestamp: envString(env, "APP_BUILD_TIMESTAMP"),
    instanceId: envString(env, "APP_INSTANCE_ID"),
    ...flags,
    strictMode,
  };

  const storageProvider = envString(env, "MEDIA_STORAGE_PROVIDER", flags.isProduction ? undefined : "local") as StorageProviderName | undefined;
  if (!storageProvider || !storageProviders.includes(storageProvider)) {
    addIssue(issues, { code: "STORAGE_PROVIDER_INVALID", field: "MEDIA_STORAGE_PROVIDER", message: "MEDIA_STORAGE_PROVIDER must be local, mock, s3, r2, supabase, or firebase.", severity: "error", sensitive: false });
  }

  const server = {
    host: envString(env, "API_HOST", envString(env, "MEDIA_API_HOST", "127.0.0.1"))!,
    port: parseInteger(env.PORT ?? env.API_PORT ?? env.MEDIA_API_PORT, "API_PORT", 5313, issues, { min: 1, max: 65535 }),
    publicApiBaseUrl: envString(env, "PUBLIC_API_BASE_URL"),
    adminAppBaseUrl: envString(env, "ADMIN_APP_BASE_URL"),
    publicAppBaseUrl: envString(env, "PUBLIC_APP_BASE_URL"),
    trustProxy: parseBoolean(env.TRUST_PROXY, "TRUST_PROXY", flags.isProduction, issues),
    requestBodyLimit: envString(env, "REQUEST_BODY_LIMIT", "2mb")!,
    shutdownTimeoutMs: parseInteger(env.SERVER_SHUTDOWN_TIMEOUT_MS, "SERVER_SHUTDOWN_TIMEOUT_MS", 10_000, issues),
    corsAllowedOrigins: parseUrlList(env.CORS_ALLOWED_ORIGINS, "CORS_ALLOWED_ORIGINS", issues),
  };

  const database = {
    uri: envString(env, "MONGODB_URI"),
    databaseName: envString(env, "MONGODB_DATABASE"),
    connectTimeoutMs: parseInteger(env.MONGODB_CONNECT_TIMEOUT_MS, "MONGODB_CONNECT_TIMEOUT_MS", 10_000, issues),
    serverSelectionTimeoutMs: parseInteger(env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, "MONGODB_SERVER_SELECTION_TIMEOUT_MS", 10_000, issues),
    maxPoolSize: parseInteger(env.MONGODB_MAX_POOL_SIZE, "MONGODB_MAX_POOL_SIZE", 20, issues),
    minPoolSize: parseInteger(env.MONGODB_MIN_POOL_SIZE, "MONGODB_MIN_POOL_SIZE", 0, issues, { allowZero: true }),
    retryWrites: parseBoolean(env.MONGODB_RETRY_WRITES, "MONGODB_RETRY_WRITES", true, issues),
    healthCheckEnabled: parseBoolean(env.MONGODB_HEALTH_CHECK_ENABLED, "MONGODB_HEALTH_CHECK_ENABLED", true, issues),
    autoMigrate: parseBoolean(env.DATABASE_AUTO_MIGRATE, "DATABASE_AUTO_MIGRATE", !flags.isProduction && !flags.isStaging, issues),
  };

  const redisUrl = envString(env, "REDIS_URL", envString(env, "MEDIA_QUEUE_REDIS_URL"));
  const redis = {
    url: redisUrl,
    prefix: envString(env, "REDIS_PREFIX", envString(env, "MEDIA_QUEUE_PREFIX", "anm-media"))!,
    connectTimeoutMs: parseInteger(env.REDIS_CONNECT_TIMEOUT_MS, "REDIS_CONNECT_TIMEOUT_MS", 10_000, issues),
    maxRetriesPerRequest: env.REDIS_MAX_RETRIES_PER_REQUEST ? parseInteger(env.REDIS_MAX_RETRIES_PER_REQUEST, "REDIS_MAX_RETRIES_PER_REQUEST", 3, issues, { allowZero: true }) : undefined,
    enableReadyCheck: parseBoolean(env.REDIS_ENABLE_READY_CHECK, "REDIS_ENABLE_READY_CHECK", true, issues),
    tlsRequired: parseBoolean(env.REDIS_TLS_REQUIRED, "REDIS_TLS_REQUIRED", flags.isProduction, issues),
    healthCheckEnabled: parseBoolean(env.REDIS_HEALTH_CHECK_ENABLED, "REDIS_HEALTH_CHECK_ENABLED", true, issues),
  };

  const auth = {
    enabled: parseBoolean(env.AUTH_ENABLED, "AUTH_ENABLED", flags.isProduction || flags.isStaging, issues),
    provider: envString(env, "AUTH_PROVIDER", flags.isProduction ? undefined : "dev") ?? "dev",
    sessionSecret: envString(env, "AUTH_SESSION_SECRET"),
    accessTokenSecret: envString(env, "AUTH_ACCESS_TOKEN_SECRET"),
    refreshTokenSecret: envString(env, "AUTH_REFRESH_TOKEN_SECRET"),
    accessTokenTtl: envString(env, "AUTH_ACCESS_TOKEN_TTL", "15m")!,
    refreshTokenTtl: envString(env, "AUTH_REFRESH_TOKEN_TTL", "30d")!,
    sessionTtl: envString(env, "AUTH_SESSION_TTL", "8h")!,
    cookieName: envString(env, "AUTH_COOKIE_NAME", "anm_admin_session")!,
    cookieDomain: envString(env, "AUTH_COOKIE_DOMAIN"),
    cookieSecure: parseBoolean(env.AUTH_COOKIE_SECURE, "AUTH_COOKIE_SECURE", flags.isProduction || flags.isStaging, issues),
    cookieSameSite: (envString(env, "AUTH_COOKIE_SAME_SITE", "lax")!.toLowerCase() as "lax" | "strict" | "none"),
    passwordMinLength: parseInteger(env.AUTH_PASSWORD_MIN_LENGTH, "AUTH_PASSWORD_MIN_LENGTH", 12, issues),
    bcryptRounds: parseInteger(env.AUTH_BCRYPT_ROUNDS, "AUTH_BCRYPT_ROUNDS", 12, issues, { min: 8, max: 16 }),
    initialAdminBootstrapEnabled: parseBoolean(env.AUTH_INITIAL_ADMIN_BOOTSTRAP_ENABLED, "AUTH_INITIAL_ADMIN_BOOTSTRAP_ENABLED", false, issues),
    initialAdminEmail: envString(env, "AUTH_INITIAL_ADMIN_EMAIL"),
    passwordResetEnabled: parseBoolean(env.AUTH_PASSWORD_RESET_ENABLED, "AUTH_PASSWORD_RESET_ENABLED", false, issues),
    legacyDevAdminToken: envString(env, "MEDIA_ADMIN_DEV_TOKEN", flags.isProduction ? undefined : "dev-admin-token"),
    authDisabled: parseBoolean(env.MEDIA_AUTH_DISABLED, "MEDIA_AUTH_DISABLED", false, issues),
  };

  if (!["lax", "strict", "none"].includes(auth.cookieSameSite)) {
    addIssue(issues, { code: "AUTH_COOKIE_SAME_SITE_INVALID", field: "AUTH_COOKIE_SAME_SITE", message: "AUTH_COOKIE_SAME_SITE must be lax, strict, or none.", severity: "error", sensitive: false });
  }

  const storage = {
    provider: storageProvider ?? "local",
    mockEnabled: parseBoolean(env.MEDIA_STORAGE_MOCK_ENABLED, "MEDIA_STORAGE_MOCK_ENABLED", !flags.isProduction && storageProvider === "mock", issues),
    localEnabled: parseBoolean(env.MEDIA_STORAGE_LOCAL_ENABLED, "MEDIA_STORAGE_LOCAL_ENABLED", !flags.isProduction, issues),
    endpoint: envString(env, "MEDIA_STORAGE_ENDPOINT"),
    region: envString(env, "MEDIA_STORAGE_REGION", "auto")!,
    bucket: envString(env, "MEDIA_STORAGE_BUCKET", flags.isProduction ? undefined : "ascend-nexus-media-local") ?? "",
    accessKeyId: envString(env, "MEDIA_STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: envString(env, "MEDIA_STORAGE_SECRET_ACCESS_KEY"),
    publicBaseUrl: envString(env, "MEDIA_STORAGE_PUBLIC_BASE_URL"),
    publicPrefix: envString(env, "MEDIA_STORAGE_PUBLIC_PREFIX", "public")!,
    privatePrefix: envString(env, "MEDIA_STORAGE_PRIVATE_PREFIX", "private")!,
    forcePathStyle: parseBoolean(env.MEDIA_STORAGE_FORCE_PATH_STYLE, "MEDIA_STORAGE_FORCE_PATH_STYLE", true, issues),
    signedUrlExpirationSeconds: parseInteger(env.MEDIA_STORAGE_SIGNED_URL_EXPIRATION_SECONDS ?? env.MEDIA_SIGNED_URL_EXPIRATION_SECONDS, "MEDIA_STORAGE_SIGNED_URL_EXPIRATION_SECONDS", 900, issues),
    healthCheckEnabled: parseBoolean(env.MEDIA_STORAGE_HEALTH_CHECK_ENABLED, "MEDIA_STORAGE_HEALTH_CHECK_ENABLED", true, issues),
    allowProductionMockFallback: parseBoolean(env.MEDIA_STORAGE_ALLOW_PRODUCTION_MOCK_FALLBACK ?? env.MEDIA_STORAGE_ALLOW_MOCK_FALLBACK, "MEDIA_STORAGE_ALLOW_PRODUCTION_MOCK_FALLBACK", false, issues),
    localRoot: path.resolve(envString(env, "MEDIA_STORAGE_LOCAL_ROOT", path.join(projectRoot, "server/uploads/media"))!),
    dataRoot: path.resolve(envString(env, "MEDIA_DATA_ROOT", path.join(projectRoot, "server/data"))!),
  };

  const cdn = {
    enabled: parseBoolean(env.MEDIA_CDN_ENABLED, "MEDIA_CDN_ENABLED", false, issues),
    provider: envString(env, "MEDIA_CDN_PROVIDER", "none")!,
    baseUrl: envString(env, "MEDIA_CDN_BASE_URL"),
    imageBaseUrl: envString(env, "MEDIA_CDN_IMAGE_BASE_URL"),
    audioBaseUrl: envString(env, "MEDIA_CDN_AUDIO_BASE_URL"),
    cacheBustStrategy: envString(env, "MEDIA_CDN_CACHE_BUST_STRATEGY", "query_version")!,
    responsiveImagesEnabled: parseBoolean(env.MEDIA_CDN_RESPONSIVE_IMAGES_ENABLED, "MEDIA_CDN_RESPONSIVE_IMAGES_ENABLED", true, issues),
    invalidationEnabled: parseBoolean(env.MEDIA_CDN_INVALIDATION_ENABLED, "MEDIA_CDN_INVALIDATION_ENABLED", false, issues),
    healthCheckEnabled: parseBoolean(env.MEDIA_CDN_HEALTH_CHECK_ENABLED, "MEDIA_CDN_HEALTH_CHECK_ENABLED", true, issues),
  };

  const uploads = {
    enabled: parseBoolean(env.MEDIA_UPLOADS_ENABLED, "MEDIA_UPLOADS_ENABLED", true, issues),
    apiMode: envString(env, "MEDIA_UPLOAD_API_MODE", "backend_proxy")!,
    maxImageBytes: parseInteger(env.MEDIA_UPLOAD_MAX_IMAGE_BYTES, "MEDIA_UPLOAD_MAX_IMAGE_BYTES", 16 * 1024 * 1024, issues),
    maxAudioPreviewBytes: parseInteger(env.MEDIA_UPLOAD_MAX_AUDIO_PREVIEW_BYTES, "MEDIA_UPLOAD_MAX_AUDIO_PREVIEW_BYTES", 24 * 1024 * 1024, issues),
    maxFullSongBytes: parseInteger(env.MEDIA_UPLOAD_MAX_FULL_SONG_BYTES, "MEDIA_UPLOAD_MAX_FULL_SONG_BYTES", 250 * 1024 * 1024, issues),
    maxVideoBytes: env.MEDIA_UPLOAD_MAX_VIDEO_BYTES ? parseInteger(env.MEDIA_UPLOAD_MAX_VIDEO_BYTES, "MEDIA_UPLOAD_MAX_VIDEO_BYTES", 500 * 1024 * 1024, issues) : undefined,
    maxBatchFiles: parseInteger(env.MEDIA_UPLOAD_MAX_BATCH_FILES, "MEDIA_UPLOAD_MAX_BATCH_FILES", 50, issues),
    maxBatchBytes: parseInteger(env.MEDIA_UPLOAD_MAX_BATCH_BYTES, "MEDIA_UPLOAD_MAX_BATCH_BYTES", 500 * 1024 * 1024, issues),
    directUploadEnabled: parseBoolean(env.MEDIA_DIRECT_UPLOAD_ENABLED, "MEDIA_DIRECT_UPLOAD_ENABLED", true, issues),
    directUploadThresholdBytes: parseInteger(env.MEDIA_DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES ?? env.DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES, "MEDIA_DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES", 25 * 1024 * 1024, issues),
    directUploadPartSizeBytes: parseInteger(env.MEDIA_DIRECT_UPLOAD_PART_SIZE_BYTES ?? env.DIRECT_UPLOAD_PART_SIZE_BYTES, "MEDIA_DIRECT_UPLOAD_PART_SIZE_BYTES", 10 * 1024 * 1024, issues),
    directUploadParallelParts: parseInteger(env.MEDIA_DIRECT_UPLOAD_PARALLEL_PARTS ?? env.DIRECT_UPLOAD_PARALLEL_PARTS, "MEDIA_DIRECT_UPLOAD_PARALLEL_PARTS", 3, issues),
    directUploadSessionExpirationSeconds: parseInteger(env.MEDIA_DIRECT_UPLOAD_SESSION_EXPIRATION_SECONDS ?? env.DIRECT_UPLOAD_SESSION_EXPIRATION_SECONDS, "MEDIA_DIRECT_UPLOAD_SESSION_EXPIRATION_SECONDS", 3600, issues),
    directUploadMaxParts: parseInteger(env.DIRECT_UPLOAD_MAX_PARTS, "DIRECT_UPLOAD_MAX_PARTS", 10_000, issues),
    maxRetries: parseInteger(env.MEDIA_UPLOAD_MAX_RETRIES ?? env.DIRECT_UPLOAD_MAX_RETRIES_PER_PART, "MEDIA_UPLOAD_MAX_RETRIES", 3, issues),
    temporaryDirectory: path.resolve(envString(env, "MEDIA_UPLOAD_TEMP_DIRECTORY", path.join(projectRoot, ".tmp/media-uploads"))!),
    virusScanEnabled: parseBoolean(env.MEDIA_VIRUS_SCAN_ENABLED, "MEDIA_VIRUS_SCAN_ENABLED", false, issues),
    fileSignatureValidationRequired: parseBoolean(env.MEDIA_FILE_SIGNATURE_VALIDATION_REQUIRED, "MEDIA_FILE_SIGNATURE_VALIDATION_REQUIRED", true, issues),
  };

  const processing = {
    workersEnabled: parseBoolean(env.MEDIA_WORKERS_ENABLED, "MEDIA_WORKERS_ENABLED", false, issues),
    redisRequired: parseBoolean(env.MEDIA_PROCESSING_REDIS_REQUIRED, "MEDIA_PROCESSING_REDIS_REQUIRED", flags.isProduction, issues),
    imageConcurrency: parseInteger(env.MEDIA_IMAGE_WORKER_CONCURRENCY, "MEDIA_IMAGE_WORKER_CONCURRENCY", 3, issues),
    audioConcurrency: parseInteger(env.MEDIA_AUDIO_WORKER_CONCURRENCY, "MEDIA_AUDIO_WORKER_CONCURRENCY", 2, issues),
    storageConcurrency: parseInteger(env.MEDIA_STORAGE_WORKER_CONCURRENCY, "MEDIA_STORAGE_WORKER_CONCURRENCY", 2, issues),
    cdnConcurrency: parseInteger(env.MEDIA_CDN_WORKER_CONCURRENCY, "MEDIA_CDN_WORKER_CONCURRENCY", 1, issues),
    publicationConcurrency: parseInteger(env.MEDIA_PUBLICATION_WORKER_CONCURRENCY, "MEDIA_PUBLICATION_WORKER_CONCURRENCY", 2, issues),
    maxAttempts: parseInteger(env.MEDIA_JOB_MAX_ATTEMPTS, "MEDIA_JOB_MAX_ATTEMPTS", 3, issues),
    backoffMs: parseInteger(env.MEDIA_JOB_BACKOFF_MS, "MEDIA_JOB_BACKOFF_MS", 5000, issues),
    shutdownTimeoutMs: parseInteger(env.MEDIA_WORKER_SHUTDOWN_TIMEOUT_MS, "MEDIA_WORKER_SHUTDOWN_TIMEOUT_MS", 10_000, issues),
    temporaryDirectory: path.resolve(envString(env, "MEDIA_PROCESSING_TEMP_DIRECTORY", path.join(projectRoot, ".tmp/media-processing"))!),
    ffmpegPath: envString(env, "FFMPEG_PATH"),
    ffprobePath: envString(env, "FFPROBE_PATH"),
    imageProcessingEnabled: parseBoolean(env.MEDIA_IMAGE_PROCESSING_ENABLED, "MEDIA_IMAGE_PROCESSING_ENABLED", false, issues),
    audioMetadataEnabled: parseBoolean(env.MEDIA_AUDIO_METADATA_ENABLED, "MEDIA_AUDIO_METADATA_ENABLED", false, issues),
    waveformEnabled: parseBoolean(env.MEDIA_AUDIO_WAVEFORM_ENABLED, "MEDIA_AUDIO_WAVEFORM_ENABLED", false, issues),
    transcodingEnabled: parseBoolean(env.MEDIA_AUDIO_TRANSCODE_ENABLED, "MEDIA_AUDIO_TRANSCODE_ENABLED", false, issues),
  };

  const publication = {
    enabled: parseBoolean(env.MEDIA_PUBLICATION_ENABLED, "MEDIA_PUBLICATION_ENABLED", true, issues),
    waitForRequiredProcessing: parseBoolean(env.MEDIA_PUBLICATION_WAIT_FOR_REQUIRED_PROCESSING, "MEDIA_PUBLICATION_WAIT_FOR_REQUIRED_PROCESSING", true, issues),
    promoteOptionalAssets: parseBoolean(env.MEDIA_PUBLICATION_PROMOTE_OPTIONAL_ASSETS, "MEDIA_PUBLICATION_PROMOTE_OPTIONAL_ASSETS", true, issues),
    runSyncVerification: parseBoolean(env.MEDIA_PUBLICATION_RUN_SYNC_VERIFICATION, "MEDIA_PUBLICATION_RUN_SYNC_VERIFICATION", true, issues),
    rollbackOnRequiredFailure: parseBoolean(env.MEDIA_PUBLICATION_ROLLBACK_ON_REQUIRED_FAILURE, "MEDIA_PUBLICATION_ROLLBACK_ON_REQUIRED_FAILURE", true, issues),
    preservePreviousPublicVersion: parseBoolean(env.MEDIA_PUBLICATION_PRESERVE_PREVIOUS_PUBLIC_VERSION, "MEDIA_PUBLICATION_PRESERVE_PREVIOUS_PUBLIC_VERSION", true, issues),
    operationTimeoutMs: parseInteger(env.MEDIA_PUBLICATION_TIMEOUT_MS, "MEDIA_PUBLICATION_TIMEOUT_MS", 15 * 60 * 1000, issues),
    maxAttempts: parseInteger(env.MEDIA_PUBLICATION_MAX_ATTEMPTS, "MEDIA_PUBLICATION_MAX_ATTEMPTS", 3, issues),
    backoffMs: parseInteger(env.MEDIA_PUBLICATION_BACKOFF_MS, "MEDIA_PUBLICATION_BACKOFF_MS", 10_000, issues),
    lockExpirationMs: parseInteger(env.MEDIA_PUBLICATION_LOCK_EXPIRATION_MS, "MEDIA_PUBLICATION_LOCK_EXPIRATION_MS", 20 * 60 * 1000, issues),
  };

  const emailProvider = envString(env, "EMAIL_PROVIDER", "disabled") as EmailProviderName;
  const email = {
    enabled: parseBoolean(env.EMAIL_ENABLED, "EMAIL_ENABLED", false, issues),
    provider: emailProviders.includes(emailProvider) ? emailProvider : "disabled",
    apiKey: envString(env, "EMAIL_API_KEY"),
    smtpHost: envString(env, "EMAIL_SMTP_HOST"),
    smtpPort: env.EMAIL_SMTP_PORT ? parseInteger(env.EMAIL_SMTP_PORT, "EMAIL_SMTP_PORT", 587, issues, { min: 1, max: 65535 }) : undefined,
    smtpSecure: parseBoolean(env.EMAIL_SMTP_SECURE, "EMAIL_SMTP_SECURE", false, issues),
    smtpUser: envString(env, "EMAIL_SMTP_USER"),
    smtpPassword: envString(env, "EMAIL_SMTP_PASSWORD"),
    fromAddress: envString(env, "EMAIL_FROM_ADDRESS"),
    fromName: envString(env, "EMAIL_FROM_NAME", "Ascend Nexus Media"),
    replyTo: envString(env, "EMAIL_REPLY_TO"),
    contactNotificationRecipients: parseList(env.CONTACT_NOTIFICATION_RECIPIENTS),
    newsletterEnabled: parseBoolean(env.NEWSLETTER_ENABLED, "NEWSLETTER_ENABLED", false, issues),
    healthCheckEnabled: parseBoolean(env.EMAIL_HEALTH_CHECK_ENABLED, "EMAIL_HEALTH_CHECK_ENABLED", true, issues),
  };

  const analyticsProvider = envString(env, "ANALYTICS_PROVIDER", "none") as AnalyticsProviderName;
  const analytics = {
    enabled: parseBoolean(env.ANALYTICS_ENABLED, "ANALYTICS_ENABLED", false, issues),
    provider: analyticsProviders.includes(analyticsProvider) ? analyticsProvider : "none",
    publicMeasurementId: envString(env, "ANALYTICS_PUBLIC_MEASUREMENT_ID"),
    apiSecret: envString(env, "ANALYTICS_API_SECRET"),
    serverEndpoint: envString(env, "ANALYTICS_SERVER_ENDPOINT"),
    trackPageViews: parseBoolean(env.ANALYTICS_TRACK_PAGE_VIEWS, "ANALYTICS_TRACK_PAGE_VIEWS", true, issues),
    trackAudioPreview: parseBoolean(env.ANALYTICS_TRACK_AUDIO_PREVIEW, "ANALYTICS_TRACK_AUDIO_PREVIEW", true, issues),
    trackSearch: parseBoolean(env.ANALYTICS_TRACK_SEARCH, "ANALYTICS_TRACK_SEARCH", true, issues),
    trackExternalLinks: parseBoolean(env.ANALYTICS_TRACK_EXTERNAL_LINKS, "ANALYTICS_TRACK_EXTERNAL_LINKS", true, issues),
    consentRequired: parseBoolean(env.ANALYTICS_CONSENT_REQUIRED, "ANALYTICS_CONSENT_REQUIRED", true, issues),
    debug: parseBoolean(env.ANALYTICS_DEBUG, "ANALYTICS_DEBUG", !flags.isProduction, issues),
  };

  const security = {
    helmetEnabled: parseBoolean(env.SECURITY_HELMET_ENABLED, "SECURITY_HELMET_ENABLED", flags.isProduction || flags.isStaging, issues),
    contentSecurityPolicyEnabled: parseBoolean(env.SECURITY_CSP_ENABLED, "SECURITY_CSP_ENABLED", flags.isProduction || flags.isStaging, issues),
    rateLimitEnabled: parseBoolean(env.SECURITY_RATE_LIMIT_ENABLED, "SECURITY_RATE_LIMIT_ENABLED", flags.isProduction || flags.isStaging, issues),
    authRateLimitWindowMs: parseInteger(env.SECURITY_AUTH_RATE_LIMIT_WINDOW_MS, "SECURITY_AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000, issues),
    authRateLimitMax: parseInteger(env.SECURITY_AUTH_RATE_LIMIT_MAX, "SECURITY_AUTH_RATE_LIMIT_MAX", 10, issues),
    publicRateLimitWindowMs: parseInteger(env.SECURITY_PUBLIC_RATE_LIMIT_WINDOW_MS, "SECURITY_PUBLIC_RATE_LIMIT_WINDOW_MS", 60_000, issues),
    publicRateLimitMax: parseInteger(env.SECURITY_PUBLIC_RATE_LIMIT_MAX, "SECURITY_PUBLIC_RATE_LIMIT_MAX", 120, issues),
    adminRateLimitWindowMs: parseInteger(env.SECURITY_ADMIN_RATE_LIMIT_WINDOW_MS, "SECURITY_ADMIN_RATE_LIMIT_WINDOW_MS", 60_000, issues),
    adminRateLimitMax: parseInteger(env.SECURITY_ADMIN_RATE_LIMIT_MAX, "SECURITY_ADMIN_RATE_LIMIT_MAX", 60, issues),
    csrfEnabled: parseBoolean(env.SECURITY_CSRF_ENABLED, "SECURITY_CSRF_ENABLED", flags.isProduction || flags.isStaging, issues),
    signedUrlMaxExpirationSeconds: parseInteger(env.SECURITY_SIGNED_URL_MAX_EXPIRATION_SECONDS ?? env.MEDIA_SIGNED_URL_MAX_EXPIRATION_SECONDS, "SECURITY_SIGNED_URL_MAX_EXPIRATION_SECONDS", 3600, issues),
    errorDetailsEnabled: parseBoolean(env.SECURITY_ERROR_DETAILS_ENABLED, "SECURITY_ERROR_DETAILS_ENABLED", !flags.isProduction, issues),
  };

  const logging = {
    level: envString(env, "LOG_LEVEL", flags.isProduction ? "info" : "debug")!,
    format: (envString(env, "LOG_FORMAT", flags.isProduction ? "json" : "pretty") === "json" ? "json" : "pretty") as "json" | "pretty",
    pretty: parseBoolean(env.LOG_PRETTY, "LOG_PRETTY", !flags.isProduction, issues),
    redactFields: [...new Set([...defaultRedactFields, ...parseList(env.LOG_REDACT_FIELDS)])],
    requestLoggingEnabled: parseBoolean(env.LOG_REQUESTS_ENABLED, "LOG_REQUESTS_ENABLED", flags.isProduction, issues),
    auditLoggingEnabled: parseBoolean(env.LOG_AUDIT_ENABLED, "LOG_AUDIT_ENABLED", true, issues),
    destination: envString(env, "LOG_DESTINATION"),
  };

  const monitoring = {
    enabled: parseBoolean(env.MONITORING_ENABLED, "MONITORING_ENABLED", false, issues),
    provider: envString(env, "MONITORING_PROVIDER", "none")!,
    dsn: envString(env, "MONITORING_DSN"),
    environment,
    release: envString(env, "MONITORING_RELEASE", app.commitSha ?? app.version),
    sampleRate: parseSampleRate(env.MONITORING_SAMPLE_RATE, "MONITORING_SAMPLE_RATE", 1, issues),
    tracesSampleRate: parseSampleRate(env.MONITORING_TRACES_SAMPLE_RATE, "MONITORING_TRACES_SAMPLE_RATE", flags.isProduction ? 0.1 : 1, issues),
    healthChecksEnabled: parseBoolean(env.HEALTH_CHECKS_ENABLED, "HEALTH_CHECKS_ENABLED", true, issues),
  };

  const publicDelivery = {
    apiEnabled: parseBoolean(env.PUBLIC_API_ENABLED, "PUBLIC_API_ENABLED", true, issues),
    cacheEnabled: parseBoolean(env.PUBLIC_CACHE_ENABLED, "PUBLIC_CACHE_ENABLED", true, issues),
    cacheTtlSiteSeconds: parseInteger(env.PUBLIC_CACHE_TTL_SITE_SECONDS, "PUBLIC_CACHE_TTL_SITE_SECONDS", 300, issues),
    cacheTtlHomepageSeconds: parseInteger(env.PUBLIC_CACHE_TTL_HOMEPAGE_SECONDS, "PUBLIC_CACHE_TTL_HOMEPAGE_SECONDS", 120, issues),
    cacheTtlArtistSeconds: parseInteger(env.PUBLIC_CACHE_TTL_ARTIST_SECONDS, "PUBLIC_CACHE_TTL_ARTIST_SECONDS", 120, issues),
    cacheTtlReleaseSeconds: parseInteger(env.PUBLIC_CACHE_TTL_RELEASE_SECONDS, "PUBLIC_CACHE_TTL_RELEASE_SECONDS", 120, issues),
    cacheTtlGallerySeconds: parseInteger(env.PUBLIC_CACHE_TTL_GALLERY_SECONDS, "PUBLIC_CACHE_TTL_GALLERY_SECONDS", 120, issues),
    cacheTtlMetadataSeconds: parseInteger(env.PUBLIC_CACHE_TTL_METADATA_SECONDS, "PUBLIC_CACHE_TTL_METADATA_SECONDS", 300, issues),
    seedFallbackEnabled: parseBoolean(env.PUBLIC_API_SEED_FALLBACK_ENABLED, "PUBLIC_API_SEED_FALLBACK_ENABLED", !flags.isProduction, issues),
    etagEnabled: parseBoolean(env.PUBLIC_ETAG_ENABLED, "PUBLIC_ETAG_ENABLED", true, issues),
    healthCheckEnabled: parseBoolean(env.PUBLIC_DELIVERY_HEALTH_CHECK_ENABLED, "PUBLIC_DELIVERY_HEALTH_CHECK_ENABLED", true, issues),
  };

  const features = {
    adminEnabled: parseBoolean(env.FEATURE_ADMIN_ENABLED, "FEATURE_ADMIN_ENABLED", true, issues),
    mediaUploadsEnabled: uploads.enabled,
    batchUploadsEnabled: parseBoolean(env.FEATURE_BATCH_UPLOADS_ENABLED, "FEATURE_BATCH_UPLOADS_ENABLED", true, issues),
    directUploadsEnabled: uploads.directUploadEnabled,
    mediaProcessingEnabled: processing.workersEnabled || processing.imageProcessingEnabled || processing.audioMetadataEnabled || processing.waveformEnabled || processing.transcodingEnabled,
    publicationEnabled: publication.enabled,
    publicSearchEnabled: parseBoolean(env.FEATURE_PUBLIC_SEARCH_ENABLED, "FEATURE_PUBLIC_SEARCH_ENABLED", true, issues),
    publicGalleryEnabled: parseBoolean(env.FEATURE_PUBLIC_GALLERY_ENABLED, "FEATURE_PUBLIC_GALLERY_ENABLED", true, issues),
    contactEnabled: parseBoolean(env.FEATURE_CONTACT_ENABLED, "FEATURE_CONTACT_ENABLED", true, issues),
    newsletterEnabled: email.newsletterEnabled,
    analyticsEnabled: analytics.enabled,
  };

  const config: BackendConfig = {
    app,
    server,
    database,
    redis,
    auth,
    storage,
    cdn,
    uploads,
    processing,
    publication,
    email,
    analytics,
    security,
    logging,
    monitoring,
    publicDelivery,
    features,
    issues,
  };

  validateBackendConfig(config, issues);
  return deepFreeze(config);
};

export const buildPublicRuntimeConfig = (config: BackendConfig): PublicRuntimeConfig => ({
  environment: config.app.environment,
  appName: "Ascend Nexus Media",
  appVersion: config.app.version,
  publicApiBaseUrl: config.server.publicApiBaseUrl ?? "/api/public",
  publicAppBaseUrl: config.server.publicAppBaseUrl ?? "",
  adminAppBaseUrl: config.server.adminAppBaseUrl,
  cdnBaseUrl: config.cdn.baseUrl,
  analytics: {
    enabled: config.analytics.enabled,
    provider: config.analytics.provider,
    publicMeasurementId: config.analytics.publicMeasurementId,
    trackPageViews: config.analytics.trackPageViews,
    trackAudioPreview: config.analytics.trackAudioPreview,
    trackSearch: config.analytics.trackSearch,
    trackExternalLinks: config.analytics.trackExternalLinks,
    consentRequired: config.analytics.consentRequired,
    debug: config.analytics.debug && !config.app.isProduction,
  },
  features: {
    publicSearchEnabled: config.features.publicSearchEnabled,
    publicGalleryEnabled: config.features.publicGalleryEnabled,
    contactEnabled: config.features.contactEnabled,
    newsletterEnabled: config.features.newsletterEnabled,
    analyticsEnabled: config.features.analyticsEnabled,
  },
  supportContact: config.email.replyTo ?? config.email.fromAddress,
  build: {
    commitSha: config.app.commitSha,
    buildTimestamp: config.app.buildTimestamp,
  },
  metadata: {
    publicDeliveryConfigured: config.publicDelivery.apiEnabled,
  },
});

const validateBackendConfig = (config: BackendConfig, issues: ConfigurationIssue[]) => {
  const productionLike = config.app.isProduction || config.app.isStaging || config.app.strictMode;
  if (productionLike) {
    requireHttpsUrl(config.server.publicApiBaseUrl, "PUBLIC_API_BASE_URL", issues);
    requireHttpsUrl(config.server.publicAppBaseUrl, "PUBLIC_APP_BASE_URL", issues);
    requireHttpsUrl(config.server.adminAppBaseUrl, "ADMIN_APP_BASE_URL", issues);
  }

  if (productionLike && !config.server.publicApiBaseUrl) addIssue(issues, { code: "PUBLIC_API_BASE_URL_REQUIRED", field: "PUBLIC_API_BASE_URL", message: "PUBLIC_API_BASE_URL is required for staging/production.", severity: "error", sensitive: false });
  if (productionLike && !config.server.publicAppBaseUrl) addIssue(issues, { code: "PUBLIC_APP_BASE_URL_REQUIRED", field: "PUBLIC_APP_BASE_URL", message: "PUBLIC_APP_BASE_URL is required for staging/production.", severity: "error", sensitive: false });
  if (productionLike && !config.server.adminAppBaseUrl) addIssue(issues, { code: "ADMIN_APP_BASE_URL_REQUIRED", field: "ADMIN_APP_BASE_URL", message: "ADMIN_APP_BASE_URL is required for staging/production.", severity: "error", sensitive: false });
  if (productionLike && config.server.corsAllowedOrigins.includes("*")) addIssue(issues, { code: "CORS_WILDCARD_FORBIDDEN", field: "CORS_ALLOWED_ORIGINS", message: "Wildcard CORS is forbidden in staging/production.", severity: "error", sensitive: false });

  if (productionLike && !looksLikeMongoUri(config.database.uri)) addIssue(issues, { code: "DATABASE_URI_REQUIRED", field: "MONGODB_URI", message: "A persistent MongoDB URI is required for staging/production.", severity: "error", sensitive: true });
  if (productionLike && (isLocalUrl(config.database.uri) || config.database.uri?.includes("localhost"))) addIssue(issues, { code: "DATABASE_LOCAL_FORBIDDEN", field: "MONGODB_URI", message: "Local database URIs are forbidden in staging/production unless a future explicit exception is implemented.", severity: "error", sensitive: true });

  if ((config.processing.workersEnabled || config.processing.redisRequired || config.publicDelivery.cacheEnabled) && !looksLikeRedisUri(config.redis.url)) {
    addIssue(issues, { code: "REDIS_URL_REQUIRED", field: "REDIS_URL", message: "Redis is required for enabled workers, queues, cache, or production strict mode.", severity: productionLike ? "error" : "warning", sensitive: true });
  }
  if (productionLike && config.redis.tlsRequired && config.redis.url?.startsWith("redis://")) addIssue(issues, { code: "REDIS_TLS_REQUIRED", field: "REDIS_URL", message: "REDIS_URL must use rediss:// when TLS is required.", severity: "error", sensitive: true });

  if (productionLike && !config.auth.enabled) addIssue(issues, { code: "AUTH_DISABLED_FORBIDDEN", field: "AUTH_ENABLED", message: "Authentication must be enabled in staging/production.", severity: "error", sensitive: false });
  if (productionLike && config.auth.authDisabled) addIssue(issues, { code: "AUTH_BYPASS_FORBIDDEN", field: "MEDIA_AUTH_DISABLED", message: "MEDIA_AUTH_DISABLED is forbidden in staging/production.", severity: "error", sensitive: false });
  if (productionLike && isPlaceholderValue(config.auth.legacyDevAdminToken)) addIssue(issues, { code: "DEV_ADMIN_TOKEN_FORBIDDEN", field: "MEDIA_ADMIN_DEV_TOKEN", message: "Default development admin token is forbidden in staging/production.", severity: "error", sensitive: true });
  if (productionLike && !hasStrongSecret(config.auth.sessionSecret)) addIssue(issues, { code: "AUTH_SECRET_WEAK", field: "AUTH_SESSION_SECRET", message: "AUTH_SESSION_SECRET must be a strong backend-only secret.", severity: "error", sensitive: true });
  if (productionLike && !hasStrongSecret(config.auth.accessTokenSecret)) addIssue(issues, { code: "AUTH_SECRET_WEAK", field: "AUTH_ACCESS_TOKEN_SECRET", message: "AUTH_ACCESS_TOKEN_SECRET must be a strong backend-only secret.", severity: "error", sensitive: true });
  if (productionLike && !hasStrongSecret(config.auth.refreshTokenSecret)) addIssue(issues, { code: "AUTH_SECRET_WEAK", field: "AUTH_REFRESH_TOKEN_SECRET", message: "AUTH_REFRESH_TOKEN_SECRET must be a strong backend-only secret.", severity: "error", sensitive: true });
  if (productionLike && !config.auth.cookieSecure) addIssue(issues, { code: "AUTH_COOKIE_INSECURE", field: "AUTH_COOKIE_SECURE", message: "Secure auth cookies are required in staging/production.", severity: "error", sensitive: false });
  if (config.auth.initialAdminBootstrapEnabled && config.auth.initialAdminEmail && !safeEmail(config.auth.initialAdminEmail)) addIssue(issues, { code: "AUTH_BOOTSTRAP_EMAIL_INVALID", field: "AUTH_INITIAL_ADMIN_EMAIL", message: "AUTH_INITIAL_ADMIN_EMAIL must be a valid email address.", severity: "error", sensitive: false });

  if (productionLike && ["mock", "local"].includes(config.storage.provider)) addIssue(issues, { code: "STORAGE_PROVIDER_PERSISTENT_REQUIRED", field: "MEDIA_STORAGE_PROVIDER", message: "Production storage provider must be persistent and non-mock.", severity: "error", sensitive: false });
  if (productionLike && (config.storage.mockEnabled || config.storage.allowProductionMockFallback)) addIssue(issues, { code: "PRODUCTION_MOCK_STORAGE_FORBIDDEN", field: "MEDIA_STORAGE_MOCK_ENABLED", message: "Mock storage and mock fallback are forbidden in staging/production.", severity: "error", sensitive: false });
  if (["s3", "r2"].includes(config.storage.provider)) {
    for (const [field, value, sensitive] of [
      ["MEDIA_STORAGE_ENDPOINT", config.storage.endpoint, false],
      ["MEDIA_STORAGE_BUCKET", config.storage.bucket, false],
      ["MEDIA_STORAGE_ACCESS_KEY_ID", config.storage.accessKeyId, true],
      ["MEDIA_STORAGE_SECRET_ACCESS_KEY", config.storage.secretAccessKey, true],
    ] as const) {
      if (!value || isPlaceholderValue(value)) addIssue(issues, { code: "STORAGE_PROVIDER_FIELD_REQUIRED", field, message: `${field} is required for ${config.storage.provider} storage.`, severity: "error", sensitive });
    }
  }
  if (productionLike && !config.storage.publicBaseUrl && !config.cdn.baseUrl) addIssue(issues, { code: "PUBLIC_MEDIA_URL_REQUIRED", field: "MEDIA_STORAGE_PUBLIC_BASE_URL", message: "A public media base URL or CDN base URL is required.", severity: "error", sensitive: false });
  if (productionLike) requireHttpsUrl(config.storage.publicBaseUrl, "MEDIA_STORAGE_PUBLIC_BASE_URL", issues);

  if (config.cdn.enabled) {
    if (!config.cdn.baseUrl) addIssue(issues, { code: "CDN_BASE_URL_REQUIRED", field: "MEDIA_CDN_BASE_URL", message: "MEDIA_CDN_BASE_URL is required when CDN is enabled.", severity: "error", sensitive: false });
    if (productionLike) requireHttpsUrl(config.cdn.baseUrl, "MEDIA_CDN_BASE_URL", issues);
  }

  if (config.uploads.directUploadEnabled && !["s3", "r2"].includes(config.storage.provider)) addIssue(issues, { code: "DIRECT_UPLOAD_PROVIDER_UNSUPPORTED", field: "MEDIA_DIRECT_UPLOAD_ENABLED", message: "Direct upload is only production-compatible with S3/R2 providers.", severity: productionLike ? "error" : "warning", sensitive: false });
  if (productionLike && !config.uploads.fileSignatureValidationRequired) addIssue(issues, { code: "FILE_SIGNATURE_VALIDATION_REQUIRED", field: "MEDIA_FILE_SIGNATURE_VALIDATION_REQUIRED", message: "File signature validation must be enabled in staging/production.", severity: "error", sensitive: false });
  if (productionLike && !config.uploads.virusScanEnabled) addIssue(issues, { code: "VIRUS_SCAN_DISABLED", field: "MEDIA_VIRUS_SCAN_ENABLED", message: "Virus scanning is not configured; this remains a launch blocker until implemented or risk-accepted.", severity: "warning", sensitive: false });

  if (productionLike && config.publicDelivery.seedFallbackEnabled) addIssue(issues, { code: "PUBLIC_SEED_FALLBACK_FORBIDDEN", field: "PUBLIC_API_SEED_FALLBACK_ENABLED", message: "Public seed fallback is forbidden in staging/production.", severity: "error", sensitive: false });
  if (productionLike && !config.publicDelivery.apiEnabled) addIssue(issues, { code: "PUBLIC_API_DISABLED_FORBIDDEN", field: "PUBLIC_API_ENABLED", message: "Public API must be enabled in staging/production.", severity: "error", sensitive: false });
  if (productionLike && config.publicDelivery.cacheEnabled && !config.redis.url) addIssue(issues, { code: "PUBLIC_CACHE_REDIS_REQUIRED", field: "REDIS_URL", message: "Public cache requires Redis in staging/production strict mode.", severity: "error", sensitive: true });

  if (productionLike && !config.publication.enabled) addIssue(issues, { code: "PUBLICATION_DISABLED_FORBIDDEN", field: "MEDIA_PUBLICATION_ENABLED", message: "Publication pipeline must be enabled in staging/production.", severity: "error", sensitive: false });
  if (productionLike && !config.processing.workersEnabled) addIssue(issues, { code: "WORKERS_DISABLED_FORBIDDEN", field: "MEDIA_WORKERS_ENABLED", message: "Workers must be enabled in staging/production.", severity: "error", sensitive: false });
  if (config.processing.imageProcessingEnabled && !config.processing.ffmpegPath) {
    addIssue(issues, { code: "IMAGE_PROCESSOR_UNVERIFIED", field: "MEDIA_IMAGE_PROCESSING_ENABLED", message: "Image processing is enabled but the processor dependency is not verified by config.", severity: "warning", sensitive: false });
  }
  if ((config.processing.audioMetadataEnabled || config.processing.waveformEnabled || config.processing.transcodingEnabled) && (!config.processing.ffmpegPath || !config.processing.ffprobePath)) {
    addIssue(issues, { code: "AUDIO_TOOLS_REQUIRED", field: "FFMPEG_PATH", message: "FFMPEG_PATH and FFPROBE_PATH are required when audio processing is enabled.", severity: productionLike ? "error" : "warning", sensitive: false });
  }

  if (config.email.enabled) {
    if (config.email.provider === "disabled") addIssue(issues, { code: "EMAIL_PROVIDER_REQUIRED", field: "EMAIL_PROVIDER", message: "EMAIL_PROVIDER is required when email is enabled.", severity: "error", sensitive: false });
    if (!safeEmail(config.email.fromAddress)) addIssue(issues, { code: "EMAIL_FROM_INVALID", field: "EMAIL_FROM_ADDRESS", message: "EMAIL_FROM_ADDRESS must be valid when email is enabled.", severity: "error", sensitive: false });
    if (["sendgrid", "postmark", "resend", "custom"].includes(config.email.provider) && (!config.email.apiKey || isPlaceholderValue(config.email.apiKey))) {
      addIssue(issues, { code: "EMAIL_API_KEY_REQUIRED", field: "EMAIL_API_KEY", message: "EMAIL_API_KEY is required for the selected email provider.", severity: "error", sensitive: true });
    }
    if (config.email.provider === "smtp" && (!config.email.smtpHost || !config.email.smtpUser || !config.email.smtpPassword)) {
      addIssue(issues, { code: "EMAIL_SMTP_REQUIRED", field: "EMAIL_SMTP_HOST", message: "SMTP host, user, and password are required when SMTP email is enabled.", severity: "error", sensitive: true });
    }
  }
  if (productionLike && config.features.contactEnabled && !config.email.enabled) addIssue(issues, { code: "CONTACT_EMAIL_REQUIRED", field: "EMAIL_ENABLED", message: "Contact workflow requires email or a persisted review workflow in staging/production.", severity: "error", sensitive: false });
  if (productionLike && config.email.newsletterEnabled && !config.email.enabled) addIssue(issues, { code: "NEWSLETTER_EMAIL_REQUIRED", field: "NEWSLETTER_ENABLED", message: "Newsletter workflow requires production email/persistence configuration.", severity: "error", sensitive: false });

  if (config.analytics.enabled) {
    if (config.analytics.provider === "none") addIssue(issues, { code: "ANALYTICS_PROVIDER_REQUIRED", field: "ANALYTICS_PROVIDER", message: "ANALYTICS_PROVIDER is required when analytics is enabled.", severity: "error", sensitive: false });
    if (!config.analytics.publicMeasurementId) addIssue(issues, { code: "ANALYTICS_PUBLIC_ID_REQUIRED", field: "ANALYTICS_PUBLIC_MEASUREMENT_ID", message: "A public analytics measurement id is required when analytics is enabled.", severity: "error", sensitive: false });
  }
  if (productionLike && config.analytics.debug) addIssue(issues, { code: "ANALYTICS_DEBUG_FORBIDDEN", field: "ANALYTICS_DEBUG", message: "Analytics debug mode is forbidden in staging/production.", severity: "error", sensitive: false });

  if (productionLike && (!config.security.helmetEnabled || !config.security.contentSecurityPolicyEnabled || !config.security.rateLimitEnabled || !config.security.csrfEnabled)) {
    addIssue(issues, { code: "SECURITY_MIDDLEWARE_REQUIRED", field: "SECURITY_HELMET_ENABLED", message: "Security headers, CSP, rate limiting, and CSRF must be enabled in staging/production.", severity: "error", sensitive: false });
  }
  if (productionLike && config.security.errorDetailsEnabled) addIssue(issues, { code: "ERROR_DETAILS_FORBIDDEN", field: "SECURITY_ERROR_DETAILS_ENABLED", message: "Detailed errors are forbidden in staging/production.", severity: "error", sensitive: false });
};

function deepFreeze<T>(input: T): T {
  if (input && typeof input === "object") {
    Object.freeze(input);
    for (const value of Object.values(input as Record<string, unknown>)) deepFreeze(value);
  }
  return input;
}

let cachedConfig: BackendConfig | undefined;

export const getBackendConfig = (env: NodeJS.ProcessEnv = process.env): BackendConfig => {
  if (!cachedConfig || env !== process.env) cachedConfig = buildBackendConfig(env);
  return cachedConfig;
};

export const resetBackendConfigForTests = () => {
  cachedConfig = undefined;
};
