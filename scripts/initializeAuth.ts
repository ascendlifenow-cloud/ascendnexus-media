import { adminBootstrapService } from "../server/services/auth/AdminBootstrapService";

const roles = await adminBootstrapService.initializeRoles();
console.log(JSON.stringify({
  success: true,
  initializedRoles: roles.length,
  roleIds: roles.map((role) => role.roleId),
}, null, 2));
