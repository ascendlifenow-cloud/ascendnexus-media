const sensitivePattern = /(password|token|secret|authorization|cookie|set-cookie|apikey|api_key|accesskey|access_key|secretaccesskey|secret_access_key|signedurl|signed_url|connectionstring|connection_string|uri|dsn)/i;

export const isSensitiveConfigKey = (key: string): boolean => sensitivePattern.test(key);

export const redactConfigValue = (key: string, value: unknown): unknown => {
  if (value === undefined || value === null) return value;
  if (isSensitiveConfigKey(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => (typeof item === "object" ? redactObject(item as Record<string, unknown>) : item));
  if (typeof value === "object") return redactObject(value as Record<string, unknown>);
  return value;
};

export const redactObject = <T extends Record<string, unknown>>(input: T): Record<string, unknown> =>
  Object.fromEntries(Object.entries(input).map(([key, value]) => [key, redactConfigValue(key, value)]));

export const defaultRedactFields = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
  "apiKey",
  "accessKeyId",
  "secretAccessKey",
  "signedUrl",
  "connectionString",
  "uri",
  "dsn",
];
