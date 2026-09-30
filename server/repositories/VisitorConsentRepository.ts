import type { VisitorConsentRecord } from "../models/analytics/VisitorConsentModel";
import { BaseRepository } from "./BaseRepository";

export class VisitorConsentRepository extends BaseRepository<VisitorConsentRecord> {
  constructor() {
    super("visitorConsentRecords", "visitorConsentId");
  }

  async findByReference(consentReference: string): Promise<VisitorConsentRecord | null> {
    return this.findBy("consentReference", consentReference);
  }
}

export const visitorConsentRepository = new VisitorConsentRepository();
