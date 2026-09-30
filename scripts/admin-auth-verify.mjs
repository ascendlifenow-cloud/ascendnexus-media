const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : "true"];
}));

const command = args.get("command") || "diagnose";
const output = (payload) => console.log(JSON.stringify(payload, null, 2));

try {
  const { authenticationHealthService } = await import("../server/services/auth/AuthenticationHealthService.ts");
  const { adminBootstrapService } = await import("../server/services/auth/AdminBootstrapService.ts");
  const { adminPermissionVerificationService } = await import("../server/services/auth/AdminPermissionVerificationService.ts");
  const { adminSessionService } = await import("../server/services/auth/AdminSessionService.ts");
  const { adminUserService } = await import("../server/services/auth/AdminUserService.ts");
  const { authenticationService } = await import("../server/services/auth/AuthenticationService.ts");
  const { jsonDatabase } = await import("../server/services/media/JsonDatabase.ts");

  const fakeRequest = {
    headers: {
      "user-agent": "admin-auth-verify",
      "x-forwarded-for": "127.0.0.1",
    },
    socket: { remoteAddress: "127.0.0.1" },
  };

  let result;
  switch (command) {
    case "diagnose": {
      const [health, permissions, bootstrap] = await Promise.all([
        authenticationHealthService.getHealth(),
        adminPermissionVerificationService.buildPermissionReport(),
        adminBootstrapService.getBootstrapState(),
      ]);
      result = {
        status: health.overallStatus,
        rootCause: bootstrap.bootstrapRequired ? "No active super administrator exists or bootstrap activation is incomplete." : "Admin access path is configured; use smoke test for credential verification.",
        loginPage: "/admin/login",
        canonicalLoginApi: "/api/auth/admin/login",
        legacyLoginApi: "/api/admin/auth/login",
        health,
        permissions,
        bootstrap,
      };
      break;
    }
    case "bootstrap-status":
      result = await adminBootstrapService.getBootstrapState();
      break;
    case "roles-verify":
    case "permissions-verify":
      result = await adminPermissionVerificationService.buildPermissionReport();
      break;
    case "session-health": {
      const data = await jsonDatabase.read();
      const active = data.adminSessions.filter((session) => adminSessionService.isSessionUsable(session));
      result = { activeSessions: active.length, totalSessions: data.adminSessions.length, checkedAt: new Date().toISOString() };
      break;
    }
    case "auth-health":
      result = await authenticationHealthService.getHealth();
      break;
    case "login-smoke-test": {
      const email = args.get("email") ?? process.env.ADMIN_SMOKE_EMAIL;
      const password = args.get("password") ?? process.env.ADMIN_SMOKE_PASSWORD;
      if (!email || !password) {
        result = { status: "blocked", errors: ["ADMIN_SMOKE_EMAIL and ADMIN_SMOKE_PASSWORD or --email/--password are required for login smoke test."] };
        process.exitCode = 1;
        break;
      }
      const login = await authenticationService.login(fakeRequest, email, password);
      const session = await adminSessionService.getSessionByToken(login.sessionToken);
      if (session) await adminSessionService.revokeSession(session.sessionId, login.user.userId, "login_smoke_test_complete");
      result = { status: "ok", userId: login.user.userId, permissions: login.permissions.length, sessionCreated: Boolean(session), checkedAt: new Date().toISOString() };
      break;
    }
    case "authz-test": {
      const users = await adminUserService.listUsers();
      result = {
        status: "ok",
        users: users.map((user) => ({
          userId: user.userId,
          status: user.status,
          roles: user.roles,
          adminAccess: (user.permissions ?? []).includes("admin.access"),
        })),
      };
      break;
    }
    case "revoke-sessions": {
      const userId = args.get("user");
      if (!userId) throw new Error("--user is required.");
      await adminSessionService.revokeUserSessions(userId, "admin_auth_cli", "cli_revocation");
      result = { status: "ok", userId, checkedAt: new Date().toISOString() };
      break;
    }
    case "unlock": {
      const userId = args.get("user");
      if (!userId) throw new Error("--user is required.");
      result = await adminUserService.unlockUser(userId, "admin_auth_cli");
      break;
    }
    default:
      throw new Error(`Unknown admin auth command: ${command}`);
  }
  output(result);
  if (/"status":\s*"unavailable"|"status":\s*"blocked"|"valid":\s*false/.test(JSON.stringify(result))) process.exitCode = 1;
} catch (error) {
  output({ status: "failed", command, message: error instanceof Error ? error.message : "Unknown admin auth verification error." });
  process.exitCode = 1;
}
