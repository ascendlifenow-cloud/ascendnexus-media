import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../../middleware/adminMediaUploadMiddleware";
import { contactRepository } from "../../repositories/ContactRepository";
import { emailDeliveryRepository } from "../../repositories/EmailDeliveryRepository";
import { newsletterRepository } from "../../repositories/NewsletterRepository";
import { publicFormHealthService } from "../../services/forms/PublicFormHealthService";
import { sendJson } from "../../middleware/mediaErrorMiddleware";

const paginate = <T>(items: T[], url: URL) => {
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10)));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), pagination: { page, pageSize, totalItems: items.length, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) } };
};

export class AdminPublicFormsController {
  async health(_request: IncomingMessage, response: ServerResponse) {
    sendJson(response, 200, { success: true, data: await publicFormHealthService.getHealthReport() });
  }

  async listContact(_request: IncomingMessage, response: ServerResponse, url: URL) {
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.toLowerCase();
    let records = await contactRepository.list({ includeArchived: url.searchParams.get("archived") === "true", sort: "createdAt", direction: "desc" });
    if (status) records = records.filter((item) => item.status === status);
    if (q) records = records.filter((item) => [item.name, item.email, item.subject, item.metadata?.publicReference].some((value) => String(value ?? "").toLowerCase().includes(q)));
    sendJson(response, 200, { success: true, data: paginate(records, url) });
  }

  async getContact(_request: IncomingMessage, response: ServerResponse, contactSubmissionId: string) {
    const record = await contactRepository.get(contactSubmissionId);
    sendJson(response, record ? 200 : 404, record ? { success: true, data: record } : { success: false, errors: ["Contact submission not found."] });
  }

  async updateContact(request: IncomingMessage, response: ServerResponse, contactSubmissionId: string) {
    const body = await parseJsonBody(request) as { status?: string; note?: string; assignedTo?: string };
    const patch: Record<string, unknown> = {};
    if (body.status && ["new", "reviewing", "assigned", "responded", "closed", "spam", "archived"].includes(body.status)) patch.status = body.status;
    if (body.assignedTo) patch.assignedTo = String(body.assignedTo).slice(0, 160);
    if (body.note) {
      const existing = await contactRepository.get(contactSubmissionId);
      patch.internalNotes = [...(existing?.internalNotes ?? []), { noteId: `note_${Date.now()}`, body: String(body.note).slice(0, 2000), createdBy: "admin", createdAt: new Date().toISOString() }];
    }
    const record = await contactRepository.update(contactSubmissionId, patch);
    sendJson(response, record ? 200 : 404, record ? { success: true, data: record } : { success: false, errors: ["Contact submission not found."] });
  }

  async contactDeliveries(_request: IncomingMessage, response: ServerResponse, contactSubmissionId: string) {
    const deliveries = (await emailDeliveryRepository.list({ includeArchived: true })).filter((item) => item.relatedEntityId === contactSubmissionId);
    sendJson(response, 200, { success: true, data: deliveries });
  }

  async listNewsletter(_request: IncomingMessage, response: ServerResponse, url: URL) {
    const status = url.searchParams.get("status");
    let records = await newsletterRepository.list({ includeArchived: url.searchParams.get("archived") === "true", sort: "createdAt", direction: "desc" });
    if (status) records = records.filter((item) => item.status === status);
    sendJson(response, 200, { success: true, data: paginate(records.map((item) => ({ ...item, email: this.mask(String(item.email)), confirmationTokenHash: undefined, unsubscribeTokenHash: undefined })), url) });
  }

  async getNewsletter(_request: IncomingMessage, response: ServerResponse, subscriptionId: string) {
    const record = await newsletterRepository.get(subscriptionId);
    if (!record) return sendJson(response, 404, { success: false, errors: ["Newsletter subscription not found."] });
    sendJson(response, 200, { success: true, data: { ...record, email: this.mask(String(record.email)), confirmationTokenHash: undefined, unsubscribeTokenHash: undefined } });
  }

  private mask(email: string) {
    const [local, domain] = email.split("@");
    return local && domain ? `${local.slice(0, 2)}***@${domain}` : "masked";
  }
}

export const adminPublicFormsController = new AdminPublicFormsController();
