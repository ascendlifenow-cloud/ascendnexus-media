import type { IncomingMessage } from "node:http";
import { getBackendConfig } from "../../config/backendConfig";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { hashRequestIp } from "../../utils/auth/sessionSecurityUtils";

interface AttemptBucket {
  count: number;
  resetAt: number;
}

export class LoginProtectionService {
  private readonly attempts = new Map<string, AttemptBucket>();

  assertAllowed(request: IncomingMessage, email: string): void {
    const config = getBackendConfig();
    if (!config.security.rateLimitEnabled && !config.app.isProduction && !config.app.isStaging) return;
    const key = this.keyFor(request, email);
    const bucket = this.attempts.get(key);
    if (bucket && bucket.resetAt > Date.now() && bucket.count >= config.security.authRateLimitMax) {
      throw new AuthApiError("AUTH_RATE_LIMITED", "Too many authentication attempts. Try again later.");
    }
  }

  recordFailure(request: IncomingMessage, email: string): void {
    const config = getBackendConfig();
    const key = this.keyFor(request, email);
    const bucket = this.attempts.get(key);
    const now = Date.now();
    if (!bucket || bucket.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + config.security.authRateLimitWindowMs });
      return;
    }
    bucket.count += 1;
  }

  clear(request: IncomingMessage, email: string): void {
    this.attempts.delete(this.keyFor(request, email));
  }

  private keyFor(request: IncomingMessage, email: string): string {
    return `${hashRequestIp(request) ?? "unknown"}:${email.trim().toLowerCase()}`;
  }
}

export const loginProtectionService = new LoginProtectionService();
