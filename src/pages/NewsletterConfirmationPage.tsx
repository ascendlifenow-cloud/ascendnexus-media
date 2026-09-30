import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useConfirmNewsletter } from "../hooks/public/usePublicForms";
import { RouteMetadata } from "../components/RouteMetadata";
import { Card } from "../components/ui/Card";

export function NewsletterConfirmationPage() {
  const [params, setParams] = useSearchParams();
  const token = params.get("token") ?? "";
  const confirm = useConfirmNewsletter();
  const submitted = useRef(false);

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    confirm.mutate(token, {
      onSettled: () => setParams({}, { replace: true }),
    });
  }, [confirm, setParams, token]);

  return (
    <main className="min-h-screen bg-anm-page-gradient px-4 py-32">
      <RouteMetadata route="contact" />
      <Card className="mx-auto max-w-2xl border-white/12 bg-white/[0.055] p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Newsletter</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Subscription confirmation</h1>
        <p className="mt-5 text-white/70" role="status">
          {!token && !confirm.data ? "Confirmation token is missing." : confirm.isPending ? "Confirming..." : confirm.data?.message ?? "Confirmation failed."}
        </p>
        <Link to="/" className="anm-focus mt-8 inline-flex rounded-md border border-white/14 px-4 py-2 text-sm font-semibold text-white/78 hover:text-white">
          Return home
        </Link>
      </Card>
    </main>
  );
}
