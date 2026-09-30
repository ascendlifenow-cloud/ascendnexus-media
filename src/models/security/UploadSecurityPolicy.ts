export interface UploadSecurityPolicy {
  policyId: string;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  blockedExtensions: string[];
  blockedMimeTypes: string[];
  allowSvg: boolean;
  allowGif: boolean;
  allowUnknownMime: boolean;
  requireMimeExtensionMatch: boolean;
  maxFileNameLength: number;
  sanitizeFileName: boolean;
  blockPathTraversal: boolean;
  blockExecutableFiles: boolean;
  blockHtmlScriptFiles: boolean;
  requireUploadTarget: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

