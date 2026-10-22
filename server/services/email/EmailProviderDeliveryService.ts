import type { EmailProviderName } from "../../config/backendConfig";
import { getBackendConfig } from "../../config/backendConfig";

export interface EmailProviderMessage {
  recipient: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailProviderResult {
  providerMessageId?: string;
}

export class EmailProviderRequestError extends Error {
  readonly code: string;

  constructor(
    readonly provider: EmailProviderName,
    readonly status: number,
    readonly safeProviderMessage: string,
  ) {
    super(safeProviderMessage);
    this.name = "EmailProviderRequestError";
    this.code = `EMAIL_PROVIDER_REJECTED_${provider.toUpperCase()}_${status}`;
  }
}

const responseMessageId = (response: Response, payload?: Record<string, unknown>) =>
  String(payload?.id ?? payload?.MessageID ?? response.headers.get("x-message-id") ?? "").trim() || undefined;

export class EmailProviderDeliveryService {
  async send(message: EmailProviderMessage): Promise<EmailProviderResult> {
    const { email } = getBackendConfig();
    if (!email.enabled || email.provider === "disabled") throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
    if (!email.fromAddress) throw new Error("EMAIL_FROM_ADDRESS_REQUIRED");
    if (!message.subject.trim() || (!message.text?.trim() && !message.html?.trim())) throw new Error("EMAIL_CONTENT_REQUIRED");

    if (email.provider === "resend") {
      return this.request(email.provider, "https://api.resend.com/emails", {
        Authorization: `Bearer ${this.requireApiKey(email.apiKey)}`,
      }, {
        from: this.formatSender(email.fromName, email.fromAddress),
        to: [message.recipient],
        subject: message.subject,
        text: message.text,
        html: message.html,
        reply_to: email.replyTo,
      });
    }

    if (email.provider === "sendgrid") {
      return this.request(email.provider, "https://api.sendgrid.com/v3/mail/send", {
        Authorization: `Bearer ${this.requireApiKey(email.apiKey)}`,
      }, {
        personalizations: [{ to: [{ email: message.recipient }] }],
        from: { email: email.fromAddress, name: email.fromName },
        reply_to: email.replyTo ? { email: email.replyTo } : undefined,
        subject: message.subject,
        content: [
          ...(message.text ? [{ type: "text/plain", value: message.text }] : []),
          ...(message.html ? [{ type: "text/html", value: message.html }] : []),
        ],
      });
    }

    if (email.provider === "postmark") {
      return this.request(email.provider, "https://api.postmarkapp.com/email", {
        "X-Postmark-Server-Token": this.requireApiKey(email.apiKey),
      }, {
        From: this.formatSender(email.fromName, email.fromAddress),
        To: message.recipient,
        ReplyTo: email.replyTo,
        Subject: message.subject,
        TextBody: message.text,
        HtmlBody: message.html,
        MessageStream: "outbound",
      });
    }

    throw new Error(`EMAIL_PROVIDER_NOT_IMPLEMENTED:${email.provider}`);
  }

  private async request(provider: EmailProviderName, url: string, headers: Record<string, string>, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined))),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => undefined) as Record<string, unknown> | undefined;
    if (!response.ok) {
      const providerMessage = [payload?.message, payload?.error, payload?.name]
        .find((value) => typeof value === "string" && value.trim()) as string | undefined;
      const safeMessage = providerMessage
        ? providerMessage.replace(/re_[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 300)
        : `${provider} rejected the email request with status ${response.status}.`;
      throw new EmailProviderRequestError(provider, response.status, safeMessage);
    }
    return { providerMessageId: responseMessageId(response, payload) };
  }

  private requireApiKey(apiKey?: string) {
    if (!apiKey) throw new Error("EMAIL_API_KEY_REQUIRED");
    return apiKey;
  }

  private formatSender(name: string | undefined, address: string) {
    return name?.trim() ? `${name.trim()} <${address}>` : address;
  }
}

export const emailProviderDeliveryService = new EmailProviderDeliveryService();
