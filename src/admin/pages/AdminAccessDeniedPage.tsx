import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";

export function AdminAccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-anm-bg px-4 text-white">
      <section className="max-w-md rounded-md border border-white/10 bg-anm-surface-glass p-6 text-center shadow-anm-card-glow">
        <ShieldX className="mx-auto h-10 w-10 text-red-200" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-white/62">Your admin role does not include permission for that area.</p>
        <Link className="mt-5 inline-flex text-sm font-semibold text-anm-blue hover:text-white" to="/admin/dashboard">Return to dashboard</Link>
      </section>
    </main>
  );
}
