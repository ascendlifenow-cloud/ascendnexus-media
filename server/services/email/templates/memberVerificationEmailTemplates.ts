export interface MemberVerificationTemplateInput {
  displayName: string;
  verificationUrl?: string;
  expiresInHours?: number;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] ?? char));

const layout = (title: string, body: string) => ({
  subject: title,
  text: body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#050812;color:#ffffff;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;background:rgba(255,255,255,.06);padding:28px"><p style="color:#64d8ff;text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:700">Ascend Nexus Media</p><h1 style="font-size:28px;line-height:1.15;margin:16px 0">${escapeHtml(title)}</h1>${body}</div></main></body></html>`,
});

export const memberVerificationEmailTemplates = {
  registrationVerification(input: MemberVerificationTemplateInput) {
    const name = escapeHtml(input.displayName || "Member");
    const expires = input.expiresInHours ?? 24;
    const link = input.verificationUrl
      ? `<p style="margin:24px 0"><a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;border-radius:6px;background:#64d8ff;color:#050812;padding:12px 18px;font-weight:700;text-decoration:none">Verify email</a></p>`
      : "";
    return layout("Verify your Ascend Nexus Media account", `<p style="line-height:1.6;color:rgba(255,255,255,.78)">Hi ${name}, please verify your email to activate your member account.</p>${link}<p style="line-height:1.6;color:rgba(255,255,255,.62)">This verification expires in ${expires} hours. If you did not create this account, you can ignore this email.</p>`);
  },
  verificationSuccessful(input: MemberVerificationTemplateInput) {
    return layout("Your email is verified", `<p style="line-height:1.6;color:rgba(255,255,255,.78)">Hi ${escapeHtml(input.displayName || "Member")}, your Ascend Nexus Media member account is active. You can now sign in.</p>`);
  },
  verificationFailed() {
    return layout("Email verification failed", `<p style="line-height:1.6;color:rgba(255,255,255,.78)">The verification link could not be completed. Please request a new verification email from the sign-in page.</p>`);
  },
  verificationExpired() {
    return layout("Email verification expired", `<p style="line-height:1.6;color:rgba(255,255,255,.78)">The verification link has expired. Please request a fresh verification email to activate your account.</p>`);
  },
  resendVerification(input: MemberVerificationTemplateInput) {
    return this.registrationVerification(input);
  },
};
