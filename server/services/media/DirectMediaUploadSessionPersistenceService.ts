import type { DirectMediaUploadSession, DirectMediaUploadSessionStatus, DirectUploadPart } from "../../models/mediaModels";
import { jsonDatabase } from "./JsonDatabase";

export class DirectMediaUploadSessionPersistenceService {
  async create(session: DirectMediaUploadSession): Promise<DirectMediaUploadSession> {
    await jsonDatabase.update((data) => data.directMediaUploadSessions.push(session));
    return session;
  }

  async get(uploadSessionId: string): Promise<DirectMediaUploadSession | null> {
    const data = await jsonDatabase.read();
    return data.directMediaUploadSessions.find((session) => session.uploadSessionId === uploadSessionId) ?? null;
  }

  async list(): Promise<DirectMediaUploadSession[]> {
    const data = await jsonDatabase.read();
    return [...data.directMediaUploadSessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async update(uploadSessionId: string, patch: Partial<DirectMediaUploadSession>): Promise<DirectMediaUploadSession | null> {
    let updated: DirectMediaUploadSession | null = null;
    await jsonDatabase.update((data) => {
      data.directMediaUploadSessions = data.directMediaUploadSessions.map((session) => {
        if (session.uploadSessionId !== uploadSessionId) return session;
        updated = { ...session, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      });
    });
    return updated;
  }

  async mark(uploadSessionId: string, status: DirectMediaUploadSessionStatus, patch: Partial<DirectMediaUploadSession> = {}) {
    return this.update(uploadSessionId, {
      ...patch,
      status,
      completedAt: status === "completed" ? new Date().toISOString() : patch.completedAt,
      canceledAt: status === "canceled" ? new Date().toISOString() : patch.canceledAt,
    });
  }

  async updatePart(uploadSessionId: string, part: DirectUploadPart): Promise<DirectMediaUploadSession | null> {
    const session = await this.get(uploadSessionId);
    if (!session) return null;
    const uploadedParts = session.uploadedParts.map((existing) => existing.partNumber === part.partNumber ? { ...existing, ...part } : existing);
    return this.update(uploadSessionId, { uploadedParts });
  }
}

export const directMediaUploadSessionPersistenceService = new DirectMediaUploadSessionPersistenceService();
