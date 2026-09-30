export type MediaValidationSeverity = "error" | "warning" | "info";

export interface MediaValidationMessage {
  messageId: string;
  severity: MediaValidationSeverity;
  code: string;
  message: string;
  field?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
