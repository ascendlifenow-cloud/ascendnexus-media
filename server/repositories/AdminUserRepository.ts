import type { AdminUser } from "../models/auth/AdminUserModel";
import { BaseRepository } from "./BaseRepository";
export class AdminUserRepository extends BaseRepository<AdminUser & Record<string, unknown>> {
  constructor() { super("adminUsers", "userId"); }
}
export const adminUserRepository = new AdminUserRepository();
