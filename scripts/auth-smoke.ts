import { createMediaApiServer } from "../server/index";
import { adminBootstrapService } from "../server/services/auth/AdminBootstrapService";

const port = 5873;
const base = `http://127.0.0.1:${port}`;
const email = `auth-smoke-${Date.now()}@example.test`;
const password = "AuthSmokePassword123!";

const server = createMediaApiServer();

const listen = () => new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
const close = () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

await adminBootstrapService.initializeRoles();
await adminBootstrapService.bootstrapInitialAdmin({ email, password, displayName: "Auth Smoke Admin", force: true });
await listen();

try {
  const unauthenticated = await fetch(`${base}/api/admin/auth/session`);
  expect(unauthenticated.status === 401, "Unauthenticated session request should return 401.");

  const login = await fetch(`${base}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  expect(login.ok, `Login failed with ${login.status}.`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  expect(cookie, "Login should set a session cookie.");
  const loginPayload = await login.json() as { data?: { user?: { email?: string }; permissions?: string[] } };
  expect(loginPayload.data?.user?.email === email, "Login payload should include the admin user.");
  expect(loginPayload.data?.permissions?.includes("users.create"), "Super admin should receive user creation permission.");

  const session = await fetch(`${base}/api/admin/auth/session`, { headers: { Cookie: cookie! } });
  expect(session.ok, `Session lookup failed with ${session.status}.`);

  const created = await fetch(`${base}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie! },
    body: JSON.stringify({
      email: `editor-${Date.now()}@example.test`,
      displayName: "Smoke Editor",
      password: "SmokeEditorPassword123!",
      roles: ["editor"],
    }),
  });
  expect(created.status === 201, `Admin user creation failed with ${created.status}.`);

  const logout = await fetch(`${base}/api/admin/auth/logout`, { method: "POST", headers: { Cookie: cookie! } });
  expect(logout.ok, `Logout failed with ${logout.status}.`);

  console.log(JSON.stringify({ success: true, checked: ["unauthenticated_session", "login", "session_cookie", "user_create", "logout"] }, null, 2));
} finally {
  await close();
}
