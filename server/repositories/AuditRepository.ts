import type { AdminAuditEvent } from "../models/mediaModels";
import { BaseRepository } from "./BaseRepository";
export class AuditRepository extends BaseRepository<AdminAuditEvent & Record<string, unknown>> { constructor() { super("adminAuditEvents", "auditEventId"); } }
export const auditRepository = new AuditRepository();
