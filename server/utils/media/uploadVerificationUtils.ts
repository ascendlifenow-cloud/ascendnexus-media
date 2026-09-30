export const parseProviderContentLength = (metadata: Record<string, unknown> | undefined): number | undefined => {
  const value = metadata?.contentLength;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const verifyUploadedObject = (input: {
  expectedSizeBytes: number;
  providerMetadata?: Record<string, unknown>;
  checksumExpected?: string;
  checksumActual?: string;
}): { valid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const size = parseProviderContentLength(input.providerMetadata);
  if (size !== undefined && size !== input.expectedSizeBytes) errors.push("Uploaded object size does not match expected file size.");
  if (size === undefined) warnings.push("Provider did not return object size metadata during verification.");
  if (input.checksumExpected && input.checksumActual && input.checksumExpected !== input.checksumActual) errors.push("Uploaded object checksum does not match expected checksum.");
  if (input.checksumExpected && !input.checksumActual) warnings.push("Checksum verification is pending; provider did not return checksum metadata.");
  return { valid: errors.length === 0, errors, warnings };
};
