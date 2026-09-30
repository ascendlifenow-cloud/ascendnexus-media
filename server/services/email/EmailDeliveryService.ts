import { createHash, randomUUID } from "node:crypto";
import { getBackendConfig } from "../../config/backendConfig";
import type { EmailDeliveryRecord } from "../../models/email/EmailDeliveryRecordModel";
import { emailDeliveryRepository } from "../../repositories/EmailDeliveryRepository";

export interface QueueEmailDeliveryInput {
  deliveryType: NonNullable<EmailDeliveryRecord["deliveryType"]>;
  recipientCategory: NonNullable<EmailDeliveryRecord["recipientCategory"]>;
  recipient: string;
  relatedEntityType: string;
  relatedEntityId: string;
  templateKey: string;
  metadata?: Record<string, unknown>;
}

const hashEmail = (email: string) => createHash("sha256").update(email.toLowerCase()).digest("hex");

export class EmailDeliveryService {
  async queueDelivery(input: QueueEmailDeliveryInput): Promise<EmailDeliveryRecord> {
    const config = getBackendConfig();
    const now = new Date().toISOString();
    const providerConfigured = config.email.enabled && config.email.provider !== "disabled" && Boolean(config.email.fromAddress);
    const record: EmailDeliveryRecord = {
      emailDeliveryId: `email_${randomUUID()}`,
      deliveryType: input.deliveryType,
      templateKey: input.templateKey,
      recipientCategory: input.recipientCategory,
      messageType: input.deliveryType,
      recipientHash: hashEmail(input.recipient),
      recipientAddressEncryptedOrProtected: this.mask(input.recipient),
      provider: providerConfigured ? config.email.provider : "disabled",
      status: providerConfigured ? "queued" : "failed",
      attempts: 0,
      maxAttempts: 3,
      queuedAt: now,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      lastErrorCode: providerConfigured ? undefined : "EMAIL_PROVIDER_UNAVAILABLE",
      lastErrorMessageSafe: providerConfigured ? undefined : "Email provider is not configured.",
      metadata: {
        ...(input.metadata ?? {}),
        queue: "public-email-delivery",
        workerRequired: true,
      },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    return emailDeliveryRepository.create(record as EmailDeliveryRecord & Record<string, unknown>) as Promise<EmailDeliveryRecord>;
  }

  async getHealth() {
    const config = getBackendConfig();
    const records = await emailDeliveryRepository.list({ includeArchived: true });
    return {
      emailProviderAvailable: config.email.enabled && config.email.provider !== "disabled" && Boolean(config.email.fromAddress),
      emailQueueAvailable: true,
      emailWorkerAvailable: false,
      pendingDeliveryCount: records.filter((record) => record.status === "queued" || record.status === "retrying").length,
      failedDeliveryCount: records.filter((record) => record.status === "failed").length,
      deadLetterCount: records.filter((record) => record.status === "dead_letter").length,
      provider: config.email.provider,
    };
  }

  private mask(email: string) {
    const [local, domain] = email.split("@");
    if (!local || !domain) return "masked";
    return `${local.slice(0, 2)}***@${domain}`;
  }
}

export const emailDeliveryService = new EmailDeliveryService();
