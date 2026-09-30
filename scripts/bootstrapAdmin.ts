import { adminBootstrapService } from "../server/services/auth/AdminBootstrapService";

const args = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  args.set(key, value.join("=") || "true");
}

if (args.has("help")) {
  console.log("Usage: npm run admin:bootstrap -- --email=admin@example.com [--displayName='Admin Name'] [--show-token=true] [--force=true]");
  process.exit(0);
}

const email = args.get("email") ?? process.env.AUTH_INITIAL_ADMIN_EMAIL;
const password = args.get("password") ?? process.env.AUTH_INITIAL_ADMIN_PASSWORD;
const displayName = args.get("displayName") ?? process.env.AUTH_INITIAL_ADMIN_DISPLAY_NAME;
const force = args.get("force") === "true";
const showToken = args.get("show-token") === "true" || args.get("showToken") === "true";

if (!email) {
  console.error("Missing --email. Run npm run admin:bootstrap -- --help for usage.");
  process.exit(2);
}

const result = await adminBootstrapService.bootstrapInitialAdmin({ email, password, displayName, force, showToken });
console.log(JSON.stringify({
  success: true,
  mode: result.mode,
  user: result.user,
  activation: result.mode === "activation_token" ? result.activation : undefined,
}, null, 2));
