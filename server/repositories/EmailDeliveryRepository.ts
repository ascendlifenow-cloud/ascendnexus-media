import type { EmailDeliveryRecord } from "../models/email/EmailDeliveryRecordModel";
import { BaseRepository } from "./BaseRepository";

export class EmailDeliveryRepository extends BaseRepository<EmailDeliveryRecord & Record<string, unknown>> {
  constructor() {
    super("emailDeliveryRecords", "emailDeliveryId");
  }
}

export const emailDeliveryRepository = new EmailDeliveryRepository();
