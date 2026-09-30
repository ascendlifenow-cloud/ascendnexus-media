import { ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useAdminAuth } from "../hooks/useAdminAuth";

export function AdminAccountSecurityPage() {
  const { session, logout } = useAdminAuth();
  return (
    <main className="p-6 text-white">
      <section className="rounded-md border border-white/10 bg-anm-surface-glass p-6 shadow-anm-card-glow">
        <ShieldCheck className="h-8 w-8 text-anm-blue" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">Account security</h1>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-white/50">Email</dt><dd className="mt-1 font-semibold">{session?.user.email ?? "Unavailable"}</dd></div>
          <div><dt className="text-white/50">Status</dt><dd className="mt-1 font-semibold">{session?.user.status ?? "Unknown"}</dd></div>
          <div><dt className="text-white/50">Roles</dt><dd className="mt-1 font-semibold">{session?.user.roles.join(", ") || "None"}</dd></div>
          <div><dt className="text-white/50">Session expires</dt><dd className="mt-1 font-semibold">{session?.sessionExpiresAt ?? "Unknown"}</dd></div>
          <div><dt className="text-white/50">MFA</dt><dd className="mt-1 font-semibold">External/exception required before production certification</dd></div>
          <div><dt className="text-white/50">Password last changed</dt><dd className="mt-1 font-semibold">Available in backend audit history</dd></div>
        </dl>
        <Button className="mt-6" onClick={() => void logout()}>Log out</Button>
      </section>
    </main>
  );
}
