import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { adminAuthApiService } from "../services/AdminAuthApiService";

export function AdminActivationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [setupToken, setSetupToken] = useState(params.get("token") ?? "");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminAuthApiService.activateAdmin(setupToken, password, displayName);
      setMessage("Admin account activated. You can sign in now.");
      setTimeout(() => navigate("/admin/login", { replace: true }), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-anm-bg px-4 text-white">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-anm-surface-glass p-6 shadow-anm-card-glow">
        <KeyRound className="h-8 w-8 text-anm-blue" aria-hidden />
        <h1 className="mt-5 text-2xl font-semibold">Activate administrator</h1>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-semibold text-white/74">
            Setup token
            <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} autoComplete="one-time-code" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/74">
            Display name
            <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/74">
            New password
            <span className="flex rounded-md border border-white/10 bg-white/[0.06] focus-within:border-anm-blue">
              <input className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white outline-none" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
              <button className="px-3 text-xs font-semibold text-anm-blue" type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>
            </span>
          </label>
          {error ? <p role="alert" className="rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}
          {message ? <p className="rounded-md border border-anm-success/25 bg-anm-success/10 px-3 py-2 text-sm text-anm-success">{message}</p> : null}
          <Button type="submit" isLoading={loading}>Activate account</Button>
        </form>
        <Link className="mt-4 inline-flex text-sm font-semibold text-anm-blue hover:text-white" to="/admin/login">Back to sign in</Link>
      </section>
    </main>
  );
}
