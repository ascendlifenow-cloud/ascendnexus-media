import type { ContactSubmissionRecord } from "../models/contact/ContactSubmissionModel";
import { BaseRepository } from "./BaseRepository";
export class ContactRepository extends BaseRepository<ContactSubmissionRecord & Record<string, unknown>> { constructor() { super("contactSubmissions", "contactSubmissionId"); } }
export const contactRepository = new ContactRepository();
