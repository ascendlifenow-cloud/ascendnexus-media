import { createMediaApiServer } from "../server/index.ts";

const failures = [];
const email = `member-smoke-${Date.now()}@example.com`;
const password = "MemberSmokePassword123!";

const request = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Auth-Scope": "member", ...(options.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

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

try {
  await listen();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const registration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: "Member Smoke", acceptTerms: true, acceptPrivacy: true, newsletterOptIn: true }),
  });
  expect(registration.response.status === 201, `Registration failed: ${registration.response.status}`);
  const verificationToken = registration.payload.data?.verificationToken;
  expect(Boolean(verificationToken), "Development registration should return a verification token.");

  const preVerifyLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  expect(preVerifyLogin.response.status === 403, "Unverified member should not be able to login.");

  const verify = await request(baseUrl, "/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: verificationToken }) });
  expect(verify.response.ok, `Email verification failed: ${verify.response.status}`);

  const login = await request(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, rememberMe: true }) });
  expect(login.response.ok, `Login failed: ${login.response.status}`);
  const cookie = login.response.headers.get("set-cookie");
  expect(Boolean(cookie?.includes("anm_member_session")), "Login should set member session cookie.");

  const session = await request(baseUrl, "/api/auth/session", { headers: { Cookie: cookie ?? "" } });
  expect(session.response.ok, `Member session failed: ${session.response.status}`);
  expect(session.payload.data?.member?.email === email, "Member session returned wrong account.");

  const profile = await request(baseUrl, "/api/account/profile", { method: "PATCH", headers: { Cookie: cookie ?? "" }, body: JSON.stringify({ displayName: "Member Smoke Updated", bio: "Smoke test profile." }) });
  expect(profile.response.ok, `Profile update failed: ${profile.response.status}`);

  const prefs = await request(baseUrl, "/api/account/preferences", { method: "PATCH", headers: { Cookie: cookie ?? "" }, body: JSON.stringify({ notifications: { newsletter: false } }) });
  expect(prefs.response.ok, `Preference update failed: ${prefs.response.status}`);

  const sessions = await request(baseUrl, "/api/account/sessions", { headers: { Cookie: cookie ?? "" } });
  expect(sessions.response.ok && Array.isArray(sessions.payload.data), "Session list should return active sessions.");

  const resetRequest = await request(baseUrl, "/api/auth/password/request", { method: "POST", body: JSON.stringify({ email }) });
  const resetToken = resetRequest.payload.data?.resetToken;
  expect(Boolean(resetToken), "Development password reset should return a reset token.");
  const reset = await request(baseUrl, "/api/auth/password/reset", { method: "POST", body: JSON.stringify({ token: resetToken, password: "MemberSmokePassword456!" }) });
  expect(reset.response.ok, `Password reset failed: ${reset.response.status}`);

  const logout = await request(baseUrl, "/api/auth/logout", { method: "POST", headers: { Cookie: cookie ?? "" }, body: "{}" });
  expect(logout.response.ok, `Logout failed: ${logout.response.status}`);

  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, checked: ["register", "unverified_login_block", "verify_email", "login", "session", "profile", "preferences", "sessions", "password_reset", "logout"] }, null, 2));
  }
} finally {
  await close();
}
