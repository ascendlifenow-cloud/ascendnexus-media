import type { NewsletterSubscriptionRecord } from "../models/newsletter/NewsletterSubscriptionModel";
import { BaseRepository } from "./BaseRepository";
export class NewsletterRepository extends BaseRepository<NewsletterSubscriptionRecord & Record<string, unknown>> { constructor() { super("newsletterSubscriptions", "subscriptionId"); } }
export const newsletterRepository = new NewsletterRepository();
