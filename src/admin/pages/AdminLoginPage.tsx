import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { Button } from "../../components/ui/Button";
import { useAdminAuth } from "../hooks/useAdminAuth";

export function AdminLoginPage() {
  const { login, status } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const safeReturnTo = (value: string | null | undefined) => {
    if (!value || !value.startsWith("/admin") || value.startsWith("/admin/login") || value.startsWith("//") || /[\r\n]/.test(value)) return "/admin/dashboard";
    return value;
  };
  const from = safeReturnTo(typeof location.state === "object" && location.state && "from" in location.state ? String(location.state.from) : params.get("returnTo"));

  if (status === "authenticated") return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Admin login failed.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-anm-bg px-4 text-white">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-anm-surface-glass p-6 shadow-anm-card-glow">
        <BrandLogo />
        <h1 className="mt-8 text-2xl font-semibold">Admin sign in</h1>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-semibold text-white/74">
            Email
            <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setLoginError(null); }} autoComplete="email" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/74">
            Password
            <span className="flex rounded-md border border-white/10 bg-white/[0.06] focus-within:border-anm-blue">
              <input className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white outline-none" type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setLoginError(null); }} autoComplete="current-password" required />
              <button className="px-3 text-xs font-semibold text-anm-blue" type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>
            </span>
          </label>
          {loginError ? <p className="rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{loginError}</p> : null}
          <Button type="submit" isLoading={status === "loading"} className="w-full">
            <LogIn className="h-4 w-4" aria-hidden />
            Sign in
          </Button>
        </form>
        <a className="mt-4 inline-flex text-sm font-semibold text-anm-blue hover:text-white" href="/admin/forgot-password">Forgot password?</a>
      </section>
    </main>
  );
}
