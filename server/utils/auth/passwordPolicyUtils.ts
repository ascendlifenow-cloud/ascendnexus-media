import { getBackendConfig } from "../../config/backendConfig";
import { isPlaceholderValue } from "../../config/configParsers";

export const validatePasswordPolicy = (password: string, context: { email?: string; displayName?: string } = {}) => {
  const errors: string[] = [];
  const min = getBackendConfig().auth.passwordMinLength;
  if (!password || password.length < min) errors.push(`Password must be at least ${min} characters.`);
  if (password.length > 256) errors.push("Password is too long.");
  if (isPlaceholderValue(password)) errors.push("Password cannot be a placeholder value.");
  if (context.email && password.trim().toLowerCase() === context.email.trim().toLowerCase()) errors.push("Password cannot match the email address.");
  if (context.displayName && password.trim().toLowerCase() === context.displayName.trim().toLowerCase()) errors.push("Password cannot match the display name.");
  return { valid: errors.length === 0, errors };
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
