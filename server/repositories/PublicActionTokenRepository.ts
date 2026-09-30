import type { PublicActionTokenRecord } from "../models/forms/PublicActionTokenModel";
import { BaseRepository } from "./BaseRepository";

export class PublicActionTokenRepository extends BaseRepository<PublicActionTokenRecord & Record<string, unknown>> {
  constructor() {
    super("publicActionTokens", "publicActionTokenId");
  }

  async findByTokenHash(tokenHash: string): Promise<PublicActionTokenRecord | null> {
    return this.findBy("tokenHash", tokenHash) as Promise<PublicActionTokenRecord | null>;
  }
}

export const publicActionTokenRepository = new PublicActionTokenRepository();
