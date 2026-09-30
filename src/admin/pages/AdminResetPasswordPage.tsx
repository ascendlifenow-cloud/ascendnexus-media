import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { adminAuthApiService } from "../services/AdminAuthApiService";

export function AdminResetPasswordPage() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await adminAuthApiService.completePasswordReset(token, password);
    setMessage("Password updated. You can sign in with the new password.");
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-anm-bg px-4 text-white">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-anm-surface-glass p-6 shadow-anm-card-glow">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-semibold text-white/74">
            Reset token
            <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" value={token} onChange={(event) => setToken(event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/74">
            New password
            <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {message ? <p className="rounded-md border border-anm-success/25 bg-anm-success/10 px-3 py-2 text-sm text-anm-success">{message}</p> : null}
          <Button type="submit" isLoading={loading}>Update password</Button>
        </form>
        <Link className="mt-4 inline-flex text-sm font-semibold text-anm-blue hover:text-white" to="/admin/login">Back to sign in</Link>
      </section>
    </main>
  );
}
