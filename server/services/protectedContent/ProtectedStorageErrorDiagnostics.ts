const MAX_ERROR_BYTES = 4096;
const ERROR_READ_TIMEOUT_MS = 250;
const safeCodes = new Set([
  "InvalidArgument", "InvalidRequest", "AuthorizationHeaderMalformed", "AuthorizationQueryParametersError",
  "InvalidAccessKeyId", "SignatureDoesNotMatch", "AccessDenied", "Unauthorized", "ExpiredRequest",
  "RequestExpired", "RequestTimeTooSkewed", "InvalidToken", "InvalidSecurity", "TokenRefreshRequired",
  "InvalidBucketName", "NoSuchBucket", "NoSuchKey", "InvalidObjectName", "InvalidRange",
  "InternalError", "ServiceUnavailable", "TooManyRequests",
]);

// Never return provider text: even an error Code can contain a reflected credential or URL.
export async function readProtectedStorageErrorCode(response: Response, signal: AbortSignal): Promise<string> {
  if (!response.body || signal.aborted) return "unavailable";
  const reader = response.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stop!: () => void;
  const deadline = new Promise<string>(resolve => { stop = () => resolve("unavailable"); });
  signal.addEventListener("abort", stop, { once: true });
  timer = setTimeout(stop, ERROR_READ_TIMEOUT_MS);
  try {
    const readCode = async () => {
      const bytes = new Uint8Array(MAX_ERROR_BYTES);
      let length = 0;
      for (let chunks = 0; chunks < 32 && length < MAX_ERROR_BYTES; chunks++) {
        const { done, value } = await reader.read();
        if (done) break;
        const part = value.subarray(0, MAX_ERROR_BYTES - length);
        bytes.set(part, length);
        length += part.byteLength;
        // S3 errors are XML; inspect only the bounded Code field, not Message/Resource/RequestId.
        const code = /<Code>\s*([A-Za-z]{1,64})\s*<\/Code>/.exec(new TextDecoder().decode(bytes.subarray(0, length)))?.[1];
        if (code) return safeCodes.has(code) ? code : "unavailable";
      }
      return "unavailable";
    };
    return await Promise.race([readCode(), deadline]);
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
    // Cancellation itself may never settle; do not put it on the response's critical path.
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
