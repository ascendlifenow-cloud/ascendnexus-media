import crypto from "node:crypto";
import { validatePasswordPolicy } from "../../utils/auth/passwordPolicyUtils";

const keyLength = 64;

export class PasswordService {
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("base64url");
    const hash = crypto.scryptSync(password, salt, keyLength).toString("base64url");
    return `scrypt$1$${salt}$${hash}`;
  }

  verifyPassword(password: string, passwordHash: string): boolean {
    const [scheme, version, salt, expected] = passwordHash.split("$");
    if (scheme !== "scrypt" || version !== "1" || !salt || !expected) return false;
    const actual = crypto.scryptSync(password, salt, keyLength).toString("base64url");
    return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  }

  validatePasswordPolicy = validatePasswordPolicy;

  needsRehash(passwordHash: string): boolean {
    return !passwordHash.startsWith("scrypt$1$");
  }
}

export const passwordService = new PasswordService();
