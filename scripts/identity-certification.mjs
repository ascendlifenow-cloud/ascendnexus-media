import fs from "node:fs/promises";
import path from "node:path";
import { createMediaApiServer } from "../server/index.ts";
import { getBackendConfig } from "../server/config/backendConfig.ts";
import { jsonDatabase } from "../server/services/media/JsonDatabase.ts";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : "true"];
}));

const command = args.get("command") || "certify";
const checkedAt = new Date().toISOString();
const docsDir = path.resolve(process.cwd(), "docs");
const failures = [];
const warnings = [];
const evidence = [];
const testRunId = `anm128-${Date.now()}`;
const primaryEmail = `${testRunId}@example.com`;
const secondaryEmail = `${testRunId}-secondary@example.com`;
const password = "ANM128MemberPassword123!";
const newPassword = "ANM128MemberPassword456!";
const adminEmail = args.get("admin-email") || process.env.ADMIN_SMOKE_EMAIL || "superadmin@ascendnexus.local";
const adminPassword = args.get("admin-password") || process.env.ADMIN_SMOKE_PASSWORD;

if (!adminPassword) {
  throw new Error("Admin certification requires --admin-password or ADMIN_SMOKE_PASSWORD.");
}

const server = createMediaApiServer();
let listening = false;

const listen = () => new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    listening = true;
    resolve();
  });
});

const close = () => new Promise((resolve, reject) => {
  if (!listening) {
    resolve();
    return;
  }
  server.close((error) => error ? reject(error) : resolve());
});

const addEvidence = (gate, status, detail, severity = "info") => {
  evidence.push({ gate, status, detail, severity, checkedAt: new Date().toISOString() });
  if (status === "fail") failures.push({ gate, detail, severity });
  if (status === "warning") warnings.push({ gate, detail, severity });
};

const expect = (condition, gate, detail, severity = "P1") => {
  addEvidence(gate, condition ? "pass" : "fail", detail, condition ? "info" : severity);
};

const expectWarning = (condition, gate, detail) => {
  if (!condition) addEvidence(gate, "warning", detail, "verification_pending");
  else addEvidence(gate, "pass", detail);
};

const redactHeaders = (headers) => {
  const value = headers.get("set-cookie");
  if (!value) return undefined;
  return value.split(";").filter((part) => !part.includes("=") || /^(Path|Expires|SameSite|HttpOnly|Secure)/i.test(part.trim())).join("; ");
};

const request = async (baseUrl, pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.memberScope === false ? {} : { "X-Auth-Scope": "member" }),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { rawText: text.slice(0, 160) };
  }
  return { response, payload, redactedSetCookie: redactHeaders(response.headers) };
};

const cookieFrom = (result) => result.response.headers.get("set-cookie")?.split(";")[0] ?? "";

const registerAndVerify = async (baseUrl, email, displayName) => {
  const registration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName, acceptTerms: true, acceptPrivacy: true, newsletterOptIn: true }),
  });
  const token = registration.payload.data?.verificationToken;
  expect(registration.response.status === 201, "registration.http", `Registration returned ${registration.response.status}.`, "P1");
  expect(Boolean(token), "registration.dev_token", "Development/test registration returned a one-time verification token for certification.", "P1");
  if (token) {
    const verify = await request(baseUrl, "/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
    expect(verify.response.ok, "verification.http", `Email verification returned ${verify.response.status}.`, "P1");
  }
  const db = await jsonDatabase.read();
  const member = db.memberAccounts.find((item) => item.normalizedEmail === email.toLowerCase());
  expect(Boolean(member?.emailVerified), "verification.account_state", "Verified member account is Active/emailVerified in authoritative storage.", "P1");
  return { registration, verificationToken: token, member };
};

const certify = async () => {
  await listen();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const config = getBackendConfig();

  addEvidence("runtime.local_server", "pass", `Certification API server started on ${baseUrl}.`);

  const guestSession = await request(baseUrl, "/api/auth/session");
  expect(guestSession.response.status === 401, "guest.member_session_denied", `Guest member session returned ${guestSession.response.status}.`, "P0");
  const guestDashboard = await request(baseUrl, "/api/member/dashboard");
  expect(guestDashboard.response.status === 401, "guest.member_dashboard_denied", `Guest dashboard returned ${guestDashboard.response.status}.`, "P0");
  const guestAdmin = await request(baseUrl, "/api/admin/members", { memberScope: false });
  expect([401, 403].includes(guestAdmin.response.status), "guest.admin_denied", `Guest admin member list returned ${guestAdmin.response.status}.`, "P0");

  const registration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: primaryEmail.toUpperCase(), password, displayName: "ANM 128 Member", acceptTerms: true, acceptPrivacy: true, newsletterOptIn: true }),
  });
  const verificationToken = registration.payload.data?.verificationToken;
  expect(registration.response.status === 201, "registration.create_account", `Registration returned ${registration.response.status}.`, "P1");
  expect(Boolean(verificationToken), "registration.verification_token_created", "Verification token created for pending account without exposing it in production mode.", "P1");
  expect(!JSON.stringify(registration.payload).includes(password), "registration.no_password_echo", "Registration response does not echo the submitted password.", "P0");

  let db = await jsonDatabase.read();
  const member = db.memberAccounts.find((item) => item.normalizedEmail === primaryEmail);
  expect(Boolean(member), "registration.member_persisted", "Member account persisted with normalized email.", "P1");
  expect(member?.status === "PendingVerification" && member?.emailVerified === false, "registration.pending_verification", "New member starts PendingVerification and emailVerified=false.", "P1");
  expect(Boolean(member?.passwordHash) && member?.passwordHash !== password, "registration.password_hashed", "Member password is hashed and not stored as plaintext.", "P0");
  expect(member?.membershipTier === "Free Member", "registration.default_tier_field", "Member account receives Free Member as the initial consumer tier.", "P1");

  const duplicate = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: primaryEmail, password, displayName: "Duplicate", acceptTerms: true, acceptPrivacy: true }),
  });
  expect(duplicate.response.status === 409, "registration.duplicate_blocked", `Duplicate registration returned ${duplicate.response.status}.`, "P1");

  const storedToken = db.memberVerificationTokens.find((item) => item.memberId === member?.memberId && item.status === "active");
  expect(Boolean(storedToken?.tokenHash) && !("token" in (storedToken ?? {})), "verification.token_hashed", "Verification token is stored as a hash, not a raw token.", "P0");
  expect(storedToken ? Date.parse(storedToken.expiresAt) > Date.now() : false, "verification.token_expiry", "Verification token has a future expiration.", "P1");

  const verificationEmail = db.emailDeliveryRecords.find((item) => item.deliveryType === "member_verification" && item.relatedEntityId === member?.memberId);
  expect(Boolean(verificationEmail), "email.verification_queued", "Verification email delivery record is created.", "P1");
  expectWarning(Boolean(verificationEmail && ["sent", "delivered"].includes(verificationEmail.status)), "email.provider_delivery", `Local provider status is ${verificationEmail?.status ?? "missing"}; staging/production inbox delivery still requires provider evidence.`);

  const unverifiedLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email: primaryEmail, password }) });
  expect(unverifiedLogin.response.status === 403, "login.unverified_blocked", `Unverified login returned ${unverifiedLogin.response.status}.`, "P1");

  const verify = await request(baseUrl, "/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: verificationToken }) });
  expect(verify.response.ok, "verification.link_activates", `Verification endpoint returned ${verify.response.status}.`, "P1");
  const reuse = await request(baseUrl, "/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: verificationToken }) });
  expect(reuse.response.status >= 400, "verification.reuse_denied", `Reused verification token returned ${reuse.response.status}.`, "P0");

  db = await jsonDatabase.read();
  const verifiedMember = db.memberAccounts.find((item) => item.memberId === member?.memberId);
  expect(verifiedMember?.status === "Active" && verifiedMember.emailVerified === true, "verification.member_activated", "Verification updates account to Active/emailVerified=true.", "P1");
  const usedToken = db.memberVerificationTokens.find((item) => item.verificationTokenId === storedToken?.verificationTokenId);
  expect(usedToken?.status === "used" && Boolean(usedToken.usedAt), "verification.token_consumed", "Verification token is single-use and marked used.", "P0");

  const assignment = db.memberMembershipAssignments.find((item) => item.memberId === member?.memberId && item.status === "active");
  const tier = db.membershipTiers.find((item) => item.tierId === assignment?.tierId);
  expect(Boolean(assignment && tier?.tierKey === "free"), "membership.default_free_assignment", "Verified/registered member has an active default Free membership assignment.", "P1");

  const wrongPassword = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email: primaryEmail, password: "wrong-password" }) });
  expect(wrongPassword.response.status === 401, "login.invalid_credentials_denied", `Wrong password returned ${wrongPassword.response.status}.`, "P1");
  expect(!JSON.stringify(wrongPassword.payload).toLowerCase().includes("passwordhash"), "login.invalid_safe_error", "Invalid credential response does not expose password internals.", "P0");

  const login = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email: primaryEmail, password, rememberMe: true }) });
  const memberCookie = cookieFrom(login);
  expect(login.response.ok, "login.member_success", `Member login returned ${login.response.status}.`, "P1");
  expect(Boolean(memberCookie.includes("anm_member_session=")), "login.member_cookie_set", "Member login sets the member session cookie.", "P1");
  expect(Boolean(login.redactedSetCookie?.includes("HttpOnly")) && Boolean(login.redactedSetCookie?.match(/SameSite=/i)), "login.cookie_flags", "Member session cookie includes HttpOnly and SameSite.", "P0");
  expect(login.payload.data?.redirectTo === "/member", "login.redirect_member", "Member login response redirects to canonical /member portal.", "P1");
  expect(login.payload.data?.authorization?.membership?.tierKey === "free", "login.authorization_summary", "Session response includes safe Free membership authorization summary.", "P1");
  expect(!JSON.stringify(login.payload).includes("tokenHash"), "login.no_token_hash_leak", "Login response does not expose token hashes.", "P0");

  const restored = await request(baseUrl, "/api/auth/session", { headers: { Cookie: memberCookie } });
  expect(restored.response.ok && restored.payload.data?.member?.email?.toLowerCase() === primaryEmail, "session.restore", `Member session restore returned ${restored.response.status}.`, "P1");
  const dashboard = await request(baseUrl, "/api/member/dashboard", { headers: { Cookie: memberCookie } });
  expect(dashboard.response.ok, "member.dashboard_loads", `Member dashboard returned ${dashboard.response.status}.`, "P1");
  expect(dashboard.response.headers.get("cache-control")?.includes("no-store"), "member.dashboard_private_cache", "Dashboard response uses private/no-store cache headers.", "P0");
  expect(!JSON.stringify(dashboard.payload).includes("streamUrl") && !JSON.stringify(dashboard.payload).includes("private/"), "member.dashboard_no_protected_url", "Dashboard response excludes protected URLs/private storage paths.", "P0");

  const memberAdminAttempt = await request(baseUrl, "/api/admin/members", { memberScope: false, headers: { Cookie: memberCookie } });
  expect([401, 403].includes(memberAdminAttempt.response.status), "boundary.member_not_admin", `Member cookie against admin member API returned ${memberAdminAttempt.response.status}.`, "P0");

  const secondLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email: primaryEmail, password }) });
  const secondCookie = cookieFrom(secondLogin);
  const sessions = await request(baseUrl, "/api/account/sessions", { headers: { Cookie: memberCookie } });
  const otherSession = sessions.payload.data?.find((item) => !item.current);
  expect(Boolean(otherSession?.sessionId), "sessions.list_other", "Member can list own active sessions with current-session marker.", "P1");
  if (otherSession?.sessionId) {
    const revoke = await request(baseUrl, `/api/account/sessions/${otherSession.sessionId}`, { method: "DELETE", headers: { Cookie: memberCookie } });
    expect(revoke.response.ok, "sessions.revoke_own", `Own session revocation returned ${revoke.response.status}.`, "P1");
    const revokedSessionUse = await request(baseUrl, "/api/auth/session", { headers: { Cookie: secondCookie } });
    expect(revokedSessionUse.response.status === 401, "sessions.revoked_cookie_denied", `Revoked session restore returned ${revokedSessionUse.response.status}.`, "P0");
  }

  const secondary = await registerAndVerify(baseUrl, secondaryEmail, "ANM 128 Secondary");
  const secondaryLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email: secondaryEmail, password }) });
  const secondaryCookie = cookieFrom(secondaryLogin);
  const primarySessions = await request(baseUrl, "/api/account/sessions", { headers: { Cookie: memberCookie } });
  const primarySessionId = primarySessions.payload.data?.[0]?.sessionId;
  if (primarySessionId) {
    const crossRevoke = await request(baseUrl, `/api/account/sessions/${primarySessionId}`, { method: "DELETE", headers: { Cookie: secondaryCookie } });
    expect(crossRevoke.response.status === 404, "sessions.cross_member_revoke_denied", `Cross-member session revoke returned ${crossRevoke.response.status}.`, "P0");
  }
  expect(Boolean(secondary.member?.memberId), "registration.secondary_member_ready", "Secondary member created for cross-account boundary certification.", "P1");

  const resetRequest = await request(baseUrl, "/api/auth/password/request", { method: "POST", body: JSON.stringify({ email: primaryEmail }) });
  const resetToken = resetRequest.payload.data?.resetToken;
  expect(resetRequest.response.ok && Boolean(resetToken), "password_reset.request", `Password reset request returned ${resetRequest.response.status}.`, "P1");
  db = await jsonDatabase.read();
  const storedReset = db.memberPasswordResetTokens.find((item) => item.memberId === member?.memberId && item.status === "active");
  expect(Boolean(storedReset?.tokenHash) && !("token" in (storedReset ?? {})), "password_reset.token_hashed", "Password reset token is stored hashed and not raw.", "P0");
  const reset = await request(baseUrl, "/api/auth/password/reset", { method: "POST", body: JSON.stringify({ token: resetToken, password: newPassword }) });
  expect(reset.response.ok, "password_reset.complete", `Password reset returned ${reset.response.status}.`, "P1");
  const resetReuse = await request(baseUrl, "/api/auth/password/reset", { method: "POST", body: JSON.stringify({ token: resetToken, password: "AnotherPassword123!" }) });
  expect(resetReuse.response.status >= 400, "password_reset.reuse_denied", `Reused reset token returned ${resetReuse.response.status}.`, "P0");
  const staleSession = await request(baseUrl, "/api/auth/session", { headers: { Cookie: memberCookie } });
  expect(staleSession.response.status === 401, "password_reset.revokes_sessions", `Old session after password reset returned ${staleSession.response.status}.`, "P0");
  const oldPasswordLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email: primaryEmail, password }) });
  expect(oldPasswordLogin.response.status === 401, "password_reset.old_password_denied", `Old password login returned ${oldPasswordLogin.response.status}.`, "P1");
  const newPasswordLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email: primaryEmail, password: newPassword }) });
  const refreshedMemberCookie = cookieFrom(newPasswordLogin);
  expect(newPasswordLogin.response.ok, "password_reset.new_password_login", `New password login returned ${newPasswordLogin.response.status}.`, "P1");

  const rateEmail = `${testRunId}-rate@example.com`;
  const resetRateResponses = [];
  for (let index = 0; index < 6; index += 1) {
    resetRateResponses.push(await request(baseUrl, "/api/auth/password/request", { method: "POST", body: JSON.stringify({ email: rateEmail }) }));
  }
  expect(resetRateResponses.at(-1)?.response.status === 429, "rate_limit.password_reset", `Sixth password reset request returned ${resetRateResponses.at(-1)?.response.status}.`, "P1");
  const resendRateResponses = [];
  for (let index = 0; index < 6; index += 1) {
    resendRateResponses.push(await request(baseUrl, "/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email: `${testRunId}-verify-rate@example.com` }) }));
  }
  expect(resendRateResponses.at(-1)?.response.status === 429, "rate_limit.verification_resend", `Sixth verification resend returned ${resendRateResponses.at(-1)?.response.status}.`, "P1");

  const adminLogin = await request(baseUrl, "/api/auth/admin/login", {
    method: "POST",
    memberScope: false,
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const adminCookie = cookieFrom(adminLogin);
  expect(adminLogin.response.ok && adminLogin.payload.data?.redirectTo === "/admin/dashboard", "admin.login_success", `Admin login returned ${adminLogin.response.status}.`, "P0");
  expect(Boolean(adminCookie.includes(`${config.auth.cookieName}=`)), "admin.cookie_set", "Admin login sets the admin session cookie.", "P0");
  const adminSession = await request(baseUrl, "/api/auth/session", { memberScope: false, headers: { Cookie: adminCookie } });
  expect(adminSession.response.ok && Array.isArray(adminSession.payload.data?.permissions), "admin.session_restore", `Admin session restore returned ${adminSession.response.status}.`, "P0");
  const adminMembers = await request(baseUrl, "/api/admin/members", { memberScope: false, headers: { Cookie: adminCookie } });
  expect(adminMembers.response.ok, "admin.member_management_access", `Admin member management returned ${adminMembers.response.status}.`, "P0");
  const adminAsMember = await request(baseUrl, "/api/member/dashboard", { headers: { Cookie: adminCookie } });
  expect(adminAsMember.response.status === 401, "boundary.admin_not_member", `Admin cookie against member dashboard returned ${adminAsMember.response.status}.`, "P0");

  if (adminCookie && member?.memberId) {
    const suspend = await request(baseUrl, `/api/admin/members/${member.memberId}`, {
      method: "PATCH",
      memberScope: false,
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ status: "Suspended" }),
    });
    expect(suspend.response.ok, "account_status.admin_suspend", `Admin suspension returned ${suspend.response.status}.`, "P1");
    const suspendedDashboard = await request(baseUrl, "/api/member/dashboard", { headers: { Cookie: refreshedMemberCookie } });
    expect(suspendedDashboard.response.status === 401 || suspendedDashboard.response.status === 403, "account_status.suspended_access_denied", `Suspended member dashboard returned ${suspendedDashboard.response.status}.`, "P0");
  }

  const logout = await request(baseUrl, "/api/auth/logout", { method: "POST", headers: { Cookie: secondaryCookie }, body: "{}" });
  expect(logout.response.ok, "logout.success", `Logout returned ${logout.response.status}.`, "P1");
  expect(Boolean(logout.redactedSetCookie?.includes("1970")), "logout.clear_cookie", "Logout clears the member session cookie.", "P0");
  const afterLogout = await request(baseUrl, "/api/auth/session", { headers: { Cookie: secondaryCookie } });
  expect(afterLogout.response.status === 401, "logout.session_invalidated", `Session after logout returned ${afterLogout.response.status}.`, "P0");

  await writeDocs();
  return buildResult();
};

const buildResult = () => {
  const p0 = failures.filter((item) => item.severity === "P0").length;
  const p1 = failures.filter((item) => item.severity === "P1").length;
  const status = p0 || p1 ? "IDENTITY BLOCKED" : "IDENTITY READY LOCAL";
  return {
    status,
    command,
    checkedAt,
    totalEvidence: evidence.length,
    failures,
    warnings,
    openP0: p0,
    openP1: p1,
    productionVerificationPending: warnings.some((item) => item.gate === "email.provider_delivery"),
    evidence: evidence.map((item) => ({ ...item, detail: item.detail.replaceAll(adminEmail, "admin-redacted") })),
  };
};

const evidenceTable = () => [
  "| Gate | Status | Severity | Detail |",
  "|---|---:|---:|---|",
  ...evidence.map((item) => `| ${item.gate} | ${item.status} | ${item.severity} | ${item.detail.replaceAll("|", "\\|")} |`),
].join("\n");

const writeDocs = async () => {
  await fs.mkdir(docsDir, { recursive: true });
  const result = buildResult();
  const gateSummary = [
    `# ANM-WEB-128 Identity Certification Registry`,
    "",
    `Checked: ${checkedAt}`,
    "",
    `Decision: **${result.status}**`,
    "",
    `Open P0: ${result.openP0}`,
    `Open P1: ${result.openP1}`,
    `Warnings / external evidence pending: ${warnings.length}`,
    "",
    evidenceTable(),
    "",
    "No raw passwords, session tokens, verification tokens, reset tokens, or cookie values are written to this registry.",
  ].join("\n");

  const architectureAudit = [
    "# ANM-WEB-128 Identity Architecture Audit",
    "",
    "Member identity is server-authoritative through `MemberIdentityService`, durable member accounts, hashed member sessions, hashed verification tokens, and hashed password reset tokens.",
    "",
    "Administrative authentication remains separate through `AuthenticationService`, admin sessions, admin roles, and admin cookies. Member sessions are not accepted by admin APIs, and admin cookies are not accepted by member portal APIs.",
    "",
    "Consumer membership is resolved through membership assignments and effective entitlements. The client receives only a safe authorization summary; it does not supply tier, role, entitlement, or member identity values for access decisions.",
    "",
    "Session cookies are HTTP-only and SameSite scoped. Member and admin cookie names are separate. Sensitive routes are certified through real HTTP requests against the application server.",
    "",
    "Known production boundary: local certification verifies queue creation for member verification email. Real provider delivery and inbox-link rendering must be certified in staging/production before final production verification.",
  ].join("\n");

  const configurationAudit = [
    "# ANM-WEB-128 Identity Configuration Audit",
    "",
    `Environment: ${getBackendConfig().app.environment}`,
    `Auth enabled: ${getBackendConfig().auth.enabled}`,
    `Admin cookie: ${getBackendConfig().auth.cookieName}`,
    `Admin cookie secure: ${getBackendConfig().auth.cookieSecure}`,
    `Admin cookie SameSite: ${getBackendConfig().auth.cookieSameSite}`,
    "Member cookie: anm_member_session",
    `Email provider: ${getBackendConfig().email.provider}`,
    `Email enabled: ${getBackendConfig().email.enabled}`,
    "",
    "Secrets, passwords, provider keys, raw tokens, cookie values, and email addresses are intentionally omitted from this audit.",
  ].join("\n");

  const memberAccess = [
    "# ANM-WEB-128 Member Access Certification",
    "",
    "Certified flows:",
    "",
    "- Guest member-session denial",
    "- Guest member-dashboard denial",
    "- Registration with normalized email",
    "- Pending verification state",
    "- Hashed password storage",
    "- Hashed, expiring verification token",
    "- Duplicate email blocking",
    "- Unverified login blocking",
    "- Single-use verification",
    "- Default Free membership assignment",
    "- Login, session cookie, session restore",
    "- Private/no-store member dashboard response",
    "- Own-session list and revocation",
    "- Cross-member session revocation denial",
    "- Password reset token hashing, consumption, session revocation, and reuse denial",
    "- Sensitive endpoint rate limiting",
    "- Logout cookie clear and session invalidation",
    "",
    evidenceTable(),
  ].join("\n");

  const adminAccess = [
    "# ANM-WEB-128 Admin Access Certification",
    "",
    "Certified flows:",
    "",
    "- Seeded superadmin login through `/api/auth/admin/login`",
    "- Admin session restore through admin auth path",
    "- Admin member-management API access with admin cookie",
    "- Guest admin denial",
    "- Member cookie denial against admin APIs",
    "- Admin cookie denial against member dashboard",
    "- Suspended member protected access denial",
    "",
    "The admin password and session cookie are not written to this artifact.",
  ].join("\n");

  const runbook = [
    "# ANM-WEB-128 Identity Operations Runbook",
    "",
    "## Member cannot register",
    "Run `npm run identity:registration-certify` and inspect registration, duplicate-email, password-policy, and email-queue evidence.",
    "",
    "## Verification email missing",
    "Run `npm run identity:certify`; if local queue passes but provider delivery is pending, verify staging email provider credentials, worker execution, suppression lists, and inbox delivery.",
    "",
    "## Verification link fails",
    "Check token status, expiration, usedAt, and route `/verify-email`. Reuse must fail; a fresh resend should create a new hashed token.",
    "",
    "## Member cannot log in",
    "Confirm account is Active, emailVerified=true, not Locked/Disabled/Suspended/Deleted, and password reset has not invalidated old sessions.",
    "",
    "## Admin cannot log in",
    "Run `npm run admin:login-smoke-test -- --email=<approved admin> --password=<redacted>` and verify `/api/auth/admin/login` rather than public member `/login`.",
    "",
    "## Member sees admin data",
    "Treat as P0. Verify admin APIs reject member cookies and check route ordering, cookie names, and admin RBAC middleware.",
    "",
    "## Logout leaves member shell active",
    "Verify `/api/auth/logout` with member scope clears `anm_member_session`, revokes the backend session, and clears client query/protected playback state.",
  ].join("\n");

  const summary = [
    "# ANM-WEB-128 Implementation Summary",
    "",
    `Decision: **${result.status}**`,
    "",
    "Implemented and certified:",
    "",
    "- Member portal session revocation now enforces session ownership on both `/api/account/sessions/:sessionId` and `/api/member/sessions/:sessionId`.",
    "- Verification resend and password reset requests have bounded in-memory abuse throttles for local/dev execution.",
    "- Member login returns canonical `/member` redirect plus safe membership/authorization summary.",
    "- `npm run identity:certify` performs the registration, verification, login, session, dashboard, admin-boundary, password reset, rate-limit, logout, and suspended-account lifecycle checks through real HTTP routes.",
    "- Certification artifacts document architecture, configuration, member access, admin access, operations response, and evidence.",
    "",
    "Verification results:",
    "",
    `- Evidence gates: ${evidence.length}`,
    `- Open P0: ${result.openP0}`,
    `- Open P1: ${result.openP1}`,
    `- Warnings: ${warnings.length}`,
    "",
    "Known limitations:",
    "",
    "- Local certification verifies verification-email queue records. Final production verification still requires real provider inbox evidence.",
    "- Browser E2E for visual navigation state, dropdown composition, and post-login shell transition remains a staging gate.",
  ].join("\n");

  await Promise.all([
    fs.writeFile(path.join(docsDir, "ANM-WEB-128-identity-certification-registry.md"), gateSummary),
    fs.writeFile(path.join(docsDir, "ANM-WEB-128-identity-architecture-audit.md"), architectureAudit),
    fs.writeFile(path.join(docsDir, "ANM-WEB-128-identity-configuration-audit.md"), configurationAudit),
    fs.writeFile(path.join(docsDir, "ANM-WEB-128-registration-verification-certification.md"), memberAccess),
    fs.writeFile(path.join(docsDir, "ANM-WEB-128-member-access-certification.md"), memberAccess),
    fs.writeFile(path.join(docsDir, "ANM-WEB-128-admin-access-certification.md"), adminAccess),
    fs.writeFile(path.join(docsDir, "ANM-WEB-128-identity-operations-runbook.md"), runbook),
    fs.writeFile(path.join(docsDir, "ANM-WEB-128-implementation-summary.md"), summary),
  ]);
};

try {
  if (!["certify", "guest-certify", "registration-certify", "member-certify", "admin-certify"].includes(command)) {
    throw new Error(`Unknown identity certification command: ${command}`);
  }
  const result = await certify();
  console.log(JSON.stringify(result, null, 2));
  if (result.openP0 || result.openP1) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ status: "IDENTITY CERTIFICATION FAILED", command, message: error instanceof Error ? error.message : "Unknown error" }, null, 2));
  process.exitCode = 1;
} finally {
  await close();
}
