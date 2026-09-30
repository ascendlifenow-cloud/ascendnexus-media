import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RouteMetadata } from "../components/RouteMetadata";
import { Card } from "../components/ui/Card";
import { useUnsubscribeNewsletter } from "../hooks/public/usePublicForms";

export function NewsletterUnsubscribePage() {
  const [params, setParams] = useSearchParams();
  const token = params.get("token") ?? "";
  const unsubscribe = useUnsubscribeNewsletter();
  const submitted = useRef(false);

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    unsubscribe.mutate(token, {
      onSettled: () => setParams({}, { replace: true }),
    });
  }, [setParams, token, unsubscribe]);

  return (
    <main className="min-h-screen bg-anm-page-gradient px-4 py-32">
      <RouteMetadata route="contact" />
      <Card className="mx-auto max-w-2xl border-white/12 bg-white/[0.055] p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Newsletter</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Unsubscribe</h1>
        <p className="mt-5 text-white/70" role="status">
          {!token && !unsubscribe.data ? "Unsubscribe token is missing." : unsubscribe.isPending ? "Processing..." : unsubscribe.data?.message ?? "Unsubscribe failed."}
        </p>
        <Link to="/contact" className="anm-focus mt-8 inline-flex rounded-md border border-white/14 px-4 py-2 text-sm font-semibold text-white/78 hover:text-white">
          Contact us
        </Link>
      </Card>
    </main>
  );
}
