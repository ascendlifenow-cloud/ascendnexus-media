import type { MediaUploadTarget } from "./MediaUploadTarget";
import type { MediaValidationConfig } from "./MediaValidationConfig";
import type { MediaValidationMessage, MediaValidationSeverity } from "./MediaValidationMessage";

export interface MediaValidationRule {
  ruleId: string;
  name: string;
  description: string;
  severity: MediaValidationSeverity;
  enabled: boolean;
  validate: (
    file: File,
    uploadTarget: MediaUploadTarget,
    config: MediaValidationConfig,
  ) => MediaValidationMessage[] | Promise<MediaValidationMessage[]>;
}
