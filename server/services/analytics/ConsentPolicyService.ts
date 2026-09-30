import type { ConsentCategory, ConsentPolicyRecord } from "../../models/analytics/ConsentPolicyModel";
import { consentPolicyRepository } from "../../repositories/ConsentPolicyRepository";

const nowIso = () => new Date().toISOString();

export const consentCategories: ConsentCategory[] = ["necessary", "analytics", "functional", "marketing"];

export const defaultConsentPolicy = (): ConsentPolicyRecord => ({
  consentPolicyId: "consent_policy_default_v1",
  version: "analytics-consent-v1",
  status: "published",
  publicationState: "published",
  title: "Privacy choices",
  summary: "Choose whether Ascend Nexus Media may use optional analytics, functional, and marketing storage. Necessary storage stays enabled for security and core site operation.",
  categories: [
    {
      category: "necessary",
      required: true,
      defaultEnabled: true,
      title: "Necessary",
      description: "Required for security, form abuse prevention, accessibility preferences, and remembering privacy choices.",
      examples: ["Admin/session security", "Form abuse controls", "Consent preference storage"],
    },
    {
      category: "analytics",
      required: false,
      defaultEnabled: false,
      title: "Analytics",
      description: "Helps understand public page usage, audio-preview engagement, search outcomes, and form conversion counts without form contents or private media data.",
      examples: ["Page views", "Audio-preview starts", "Sanitized search result counts"],
    },
    {
      category: "functional",
      required: false,
      defaultEnabled: false,
      title: "Functional",
      description: "Enables optional public-site enhancements that are not required for core content delivery.",
      examples: ["Saved public preferences", "Enhanced media controls"],
    },
    {
      category: "marketing",
      required: false,
      defaultEnabled: false,
      title: "Marketing",
      description: "Reserved for explicitly reviewed marketing integrations. Disabled by default.",
      examples: ["Approved campaign measurement"],
    },
  ],
  gpcPolicy: "honor_as_opt_out",
  doNotTrackPolicy: "honor_as_opt_out",
  expirationDays: 180,
  privacyPath: "/privacy",
  createdAt: nowIso(),
  updatedAt: nowIso(),
  publishedAt: nowIso(),
  metadata: { regionMode: "global_strict", identityPolicy: "short_lived_necessary_only" },
  schemaVersion: 1,
});

export class ConsentPolicyService {
  async getActivePolicy(): Promise<ConsentPolicyRecord> {
    return (await consentPolicyRepository.getPublished()) ?? defaultConsentPolicy();
  }

  toPublicPolicy(policy: ConsentPolicyRecord) {
    return {
      version: policy.version,
      title: policy.title,
      summary: policy.summary,
      categories: policy.categories.map((category) => ({
        category: category.category,
        required: category.required,
        defaultEnabled: category.defaultEnabled,
        title: category.title,
        description: category.description,
        examples: category.examples,
      })),
      gpcPolicy: policy.gpcPolicy,
      doNotTrackPolicy: policy.doNotTrackPolicy,
      expirationDays: policy.expirationDays,
      privacyPath: policy.privacyPath,
      checkedAt: new Date().toISOString(),
    };
  }

  validateChoices(choices: unknown): Record<ConsentCategory, boolean> {
    const incoming = choices && typeof choices === "object" ? choices as Record<string, unknown> : {};
    return {
      necessary: true,
      analytics: incoming.analytics === true,
      functional: incoming.functional === true,
      marketing: incoming.marketing === true,
    };
  }
}

export const consentPolicyService = new ConsentPolicyService();
