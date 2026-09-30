import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { adminAuthApiService } from "../services/AdminAuthApiService";

export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const result = await adminAuthApiService.requestPasswordReset(email);
    setMessage(result.resetToken ? `Development reset token: ${result.resetToken}` : "If an active admin account exists, reset instructions will be sent.");
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-anm-bg px-4 text-white">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-anm-surface-glass p-6 shadow-anm-card-glow">
        <h1 className="text-2xl font-semibold">Reset admin password</h1>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-semibold text-white/74">
            Email
            <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {message ? <p className="rounded-md border border-anm-blue/25 bg-anm-blue/10 px-3 py-2 text-sm text-white/78">{message}</p> : null}
          <Button type="submit" isLoading={loading}>Request reset</Button>
        </form>
        <Link className="mt-4 inline-flex text-sm font-semibold text-anm-blue hover:text-white" to="/admin/login">Back to sign in</Link>
      </section>
    </main>
  );
}
