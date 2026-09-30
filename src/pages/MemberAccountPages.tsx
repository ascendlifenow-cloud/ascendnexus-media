import type { ReactNode } from "react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { RouteMetadata } from "../components/RouteMetadata";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";
import { authenticationShellService } from "../services/auth/AuthenticationShellService";
import { memberAuthApiService, type MemberAuthSession } from "../services/member/MemberAuthApiService";

const inputClass = "mt-2 w-full rounded-md border border-white/10 bg-black/28 px-3 py-3 text-white outline-none transition focus:border-cyanGlow";
const labelClass = "text-sm font-semibold text-white/76";
const fieldHintClass = "ml-2 rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/52";

function AuthShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <main className="bg-night px-4 py-28 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-md border border-white/10 bg-white/6 p-6 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyanGlow">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold">{title}</h1>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}

function Status({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return <p className={`mt-4 rounded-md border p-3 text-sm ${error ? "border-rose-300/20 bg-rose-500/10 text-rose-100" : "border-cyanGlow/20 bg-cyanGlow/10 text-cyan-50"}`} role={error ? "alert" : "status"}>{error ?? message}</p>;
}

export function PublicMemberLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const registered = params.get("registered") === "1";
  const verificationToken = params.get("verificationToken") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await memberAuthApiService.login({ email, password, rememberMe });
      authenticationShellService.announceAuthChange();
      const returnTo = params.get("returnTo");
      navigate(returnTo?.startsWith("/member") ? returnTo : "/member");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <RouteMetadata route="login" />
      <AuthShell eyebrow="Member sign in" title="Sign in to Ascend Nexus Media">
        <Status
          message={registered ? "Your account has been created. Please verify your email before signing in." : undefined}
        />
        {verificationToken ? (
          <p className="mt-4 rounded-md border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
            Development verification link: <Link className="font-semibold underline" to={`/verify-email?token=${encodeURIComponent(verificationToken)}`}>verify this account</Link>
          </p>
        ) : null}
        <form className="space-y-5" onSubmit={submit}>
          <label className={labelClass}>Email<input className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label className={labelClass}>Password<input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Remember me</label>
          <Button type="submit" className="w-full" isLoading={submitting}>{submitting ? "Signing In..." : "Sign In"}</Button>
        </form>
        <Status error={error} />
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/62">
          <Link to="/forgot-password" className="hover:text-white">Forgot password?</Link>
          <Link to="/register" className="hover:text-white">Create an account</Link>
        </div>
      </AuthShell>
    </>
  );
}

export function PublicRegistrationReadinessPage() {
  const navigate = useNavigate();
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setError("Password and confirmation must match.");
      setSubmitting(false);
      return;
    }
    try {
      setProgressText("Creating Account...");
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      setProgressText("Creating Member...");
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      setProgressText("Preparing Verification...");
      const result = await memberAuthApiService.register({
        email: String(form.get("email") ?? ""),
        password,
        displayName: String(form.get("displayName") ?? ""),
        acceptTerms: form.get("acceptTerms") === "on",
        acceptPrivacy: form.get("acceptPrivacy") === "on",
        newsletterOptIn: form.get("newsletterOptIn") === "on",
      });
      setProgressText("Account Created");
      const tokenQuery = result.verificationToken ? `&verificationToken=${encodeURIComponent(result.verificationToken)}` : "";
      window.setTimeout(() => navigate(`/login?registered=1${tokenQuery}`, { replace: true }), 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setProgressText("");
      setSubmitting(false);
    }
  };
  return (
    <>
      <RouteMetadata route="register" />
      <AuthShell eyebrow="Member registration" title="Create your member account">
        <form className="space-y-5" onSubmit={submit}>
          <label className={labelClass}>Display name <span className={fieldHintClass}>Required</span><input className={inputClass} name="displayName" autoComplete="name" required disabled={submitting} /></label>
          <label className={labelClass}>Email <span className={fieldHintClass}>Required</span><input className={inputClass} name="email" type="email" autoComplete="email" required disabled={submitting} /></label>
          <label className={labelClass}>Password <span className={fieldHintClass}>Required</span><input className={inputClass} name="password" type="password" autoComplete="new-password" required disabled={submitting} /></label>
          <label className={labelClass}>Confirm password <span className={fieldHintClass}>Required</span><input className={inputClass} name="confirmPassword" type="password" autoComplete="new-password" required disabled={submitting} /></label>
          <label className="flex items-start gap-3 text-sm text-white/70"><input className="mt-1" name="acceptTerms" type="checkbox" required disabled={submitting} /> <span>I accept the terms. <span className={fieldHintClass}>Required</span></span></label>
          <label className="flex items-start gap-3 text-sm text-white/70"><input className="mt-1" name="acceptPrivacy" type="checkbox" required disabled={submitting} /> <span>I accept the privacy policy. <span className={fieldHintClass}>Required</span></span></label>
          <label className="flex items-start gap-3 text-sm text-white/70"><input className="mt-1" name="newsletterOptIn" type="checkbox" disabled={submitting} /> <span>Send me release updates. <span className={fieldHintClass}>Optional</span></span></label>
          <Button type="submit" className="w-full" isLoading={submitting}>{progressText || "Create Account"}</Button>
        </form>
        <Status error={error} message={progressText && !error ? progressText : undefined} />
      </AuthShell>
    </>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState("Checking verification token...");
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  useEffect(() => {
    const token = params.get("token") ?? "";
    if (!token) {
      setState("Verification token is missing.");
      return;
    }
    memberAuthApiService.verifyEmail(token).then(() => setState("Email verified. You can now sign in.")).catch((error) => setState(error instanceof Error ? error.message : "Verification failed."));
  }, [params]);
  const resend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResendMessage("");
    const result = await memberAuthApiService.resendVerification(resendEmail);
    setResendMessage(result.verificationToken ? `Verification email queued. Development verification link: /verify-email?token=${result.verificationToken}` : "If the account needs verification, a new email has been queued.");
  };
  return (
    <AuthShell eyebrow="Email verification" title="Verify your email">
      <Status message={state} />
      <form className="mt-6 space-y-4 rounded-md border border-white/10 bg-black/20 p-4" onSubmit={resend}>
        <label className={labelClass}>Resend verification email <span className={fieldHintClass}>Optional</span><input className={inputClass} type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} placeholder="you@example.com" required /></label>
        <Button type="submit" variant="secondary">Resend Verification</Button>
      </form>
      <Status message={resendMessage} />
      <div className="mt-6"><LinkButton to="/login" variant="primary">Go to sign in</LinkButton></div>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const result = await memberAuthApiService.requestPasswordReset(email);
    setMessage(result.resetToken ? `Development reset token: ${result.resetToken}` : "If the account exists, reset instructions have been queued.");
  };
  return <AuthShell eyebrow="Password recovery" title="Reset your password"><form onSubmit={submit}><label className={labelClass}>Email<input className={inputClass} name="email" type="email" required /></label><Button type="submit" className="mt-5 w-full">Request Reset</Button></form><Status message={message} /></AuthShell>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await memberAuthApiService.resetPassword(String(form.get("token") ?? ""), String(form.get("password") ?? ""));
    setMessage("Password reset complete. Please sign in again.");
  };
  return <AuthShell eyebrow="Password reset" title="Choose a new password"><form onSubmit={submit} className="space-y-5"><label className={labelClass}>Reset token<input className={inputClass} name="token" defaultValue={params.get("token") ?? ""} required /></label><label className={labelClass}>New password<input className={inputClass} name="password" type="password" autoComplete="new-password" required /></label><Button type="submit" className="w-full">Reset Password</Button></form><Status message={message} /></AuthShell>;
}

export function LogoutPage() {
  const navigate = useNavigate();
  useEffect(() => {
    memberAuthApiService.logout().finally(() => {
      authenticationShellService.announceAuthChange();
      navigate("/login");
    });
  }, [navigate]);
  return <AuthShell eyebrow="Signing out" title="Signing you out"><Status message="Closing your member session..." /></AuthShell>;
}

export function AccountPage({ section = "overview" }: { section?: "overview" | "profile" | "security" | "sessions" | "preferences" | "delete" }) {
  const [session, setSession] = useState<MemberAuthSession | null>(null);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof memberAuthApiService.sessions>>>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    memberAuthApiService.session().then(setSession).catch((err) => setError(err instanceof Error ? err.message : "Member session required."));
    if (section === "sessions") memberAuthApiService.sessions().then(setSessions).catch(() => setSessions([]));
  }, [section]);
  const member = session?.member;
  return (
    <>
      <RouteMetadata route="login" />
      <main className="bg-night px-4 py-28 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap gap-3">
            {["overview", "profile", "security", "sessions", "preferences", "delete"].map((item) => <LinkButton key={item} to={item === "overview" ? "/account" : `/account/${item}`} variant={section === item ? "primary" : "secondary"}>{item}</LinkButton>)}
          </div>
          <div className="rounded-md border border-white/10 bg-white/6 p-6 sm:p-8">
            <h1 className="text-3xl font-semibold">Member account</h1>
            <Status error={error} message={message} />
            {member ? <p className="mt-3 text-white/66">Signed in as <span className="font-semibold text-white">{member.displayName}</span> ({member.email}) · {member.membershipTier}</p> : null}
            {member && section === "profile" ? <ProfileForm member={member} onSaved={(text) => setMessage(text)} /> : null}
            {member && section === "security" ? <SecurityForm onSaved={(text) => setMessage(text)} /> : null}
            {member && section === "preferences" ? <PreferencesForm member={member} onSaved={(text) => setMessage(text)} /> : null}
            {member && section === "sessions" ? <SessionList sessions={sessions} onChanged={() => memberAuthApiService.sessions().then(setSessions)} /> : null}
            {member && section === "delete" ? <Button variant="danger" onClick={() => memberAuthApiService.deleteAccount().then(() => setMessage("Account deleted."))}>Delete Account</Button> : null}
          </div>
        </section>
      </main>
    </>
  );
}

function ProfileForm({ member, onSaved }: { member: MemberAuthSession["member"]; onSaved: (message: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await memberAuthApiService.updateProfile({ displayName: String(form.get("displayName") ?? ""), bio: String(form.get("bio") ?? "") });
    onSaved("Profile saved.");
  };
  return <form className="mt-6 space-y-5" onSubmit={submit}><label className={labelClass}>Display name<input className={inputClass} name="displayName" defaultValue={member.displayName} /></label><label className={labelClass}>Bio<textarea className={inputClass} name="bio" defaultValue={member.bio ?? ""} /></label><Button type="submit">Save Profile</Button></form>;
}

function SecurityForm({ onSaved }: { onSaved: (message: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await memberAuthApiService.changePassword(String(form.get("currentPassword") ?? ""), String(form.get("newPassword") ?? ""));
    onSaved("Password changed. Please sign in again.");
  };
  return <form className="mt-6 space-y-5" onSubmit={submit}><label className={labelClass}>Current password<input className={inputClass} name="currentPassword" type="password" /></label><label className={labelClass}>New password<input className={inputClass} name="newPassword" type="password" /></label><Button type="submit">Change Password</Button></form>;
}

function PreferencesForm({ member, onSaved }: { member: MemberAuthSession["member"]; onSaved: (message: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await memberAuthApiService.updatePreferences({ notifications: { newsletter: form.get("newsletter") === "on", marketing: form.get("marketing") === "on" } } as Partial<MemberAuthSession["member"]["preferences"]>);
    onSaved("Preferences saved.");
  };
  return <form className="mt-6 space-y-4" onSubmit={submit}><label className="flex gap-3 text-white/70"><input name="newsletter" type="checkbox" defaultChecked={member.preferences.notifications.newsletter} /> Newsletter</label><label className="flex gap-3 text-white/70"><input name="marketing" type="checkbox" defaultChecked={member.preferences.notifications.marketing} /> Marketing updates</label><Button type="submit">Save Preferences</Button></form>;
}

function SessionList({ sessions, onChanged }: { sessions: Awaited<ReturnType<typeof memberAuthApiService.sessions>>; onChanged: () => void }) {
  return <div className="mt-6 space-y-3">{sessions.map((session) => <div key={session.sessionId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3"><span>{session.deviceLabel ?? "Member session"} · {session.current ? "current" : "active"}</span><Button variant="secondary" onClick={() => memberAuthApiService.revokeSession(session.sessionId).then(onChanged)}>Revoke</Button></div>)}</div>;
}
