import { adminPermissions } from "../../constants/auth/permissions";
import { systemRoles } from "../../constants/auth/systemRoles";
import { jsonDatabase } from "../media/JsonDatabase";

export class AdminRoleService {
  async initializeRoles() {
    await jsonDatabase.update((data) => {
      for (const role of systemRoles) {
        const existing = data.adminRoles.find((item) => item.roleId === role.roleId);
        if (existing) Object.assign(existing, { ...role, createdAt: existing.createdAt, updatedAt: new Date().toISOString() });
        else data.adminRoles.push({ ...role, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
    });
    return this.listRoles();
  }

  async listRoles() {
    const data = await jsonDatabase.read();
    return data.adminRoles.length ? data.adminRoles : systemRoles.map((role) => ({ ...role, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  }

  listPermissions() {
    return adminPermissions;
  }
}

export const adminRoleService = new AdminRoleService();
