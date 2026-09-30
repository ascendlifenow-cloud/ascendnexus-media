export interface PublicFormConsentPayload {
  consentProvided: boolean;
  consentVersion?: string;
}

export interface ContactSubmissionPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
  company?: string;
  phone?: string;
  consent: PublicFormConsentPayload;
  website?: string;
  idempotencyToken?: string;
  sourceContext?: Record<string, string | number | boolean>;
}

export interface NewsletterSubscribePayload {
  email: string;
  displayName?: string;
  consent: PublicFormConsentPayload;
  website?: string;
  idempotencyToken?: string;
  sourceContext?: Record<string, string | number | boolean>;
}

export interface PublicFormAvailability {
  enabled: boolean;
  operational: boolean;
  temporarilyUnavailable: boolean;
  newsletterOptInMode?: "single_opt_in" | "double_opt_in";
  retryAfter?: number;
}

export interface PublicFormSubmissionResult {
  success: boolean;
  message: string;
  submissionReference?: string;
  confirmationRequired?: boolean;
  retryable?: boolean;
  deliveryState?: string;
  availability?: PublicFormAvailability;
  developmentConfirmationToken?: string;
}
