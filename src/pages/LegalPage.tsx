import { Link } from "react-router-dom";
import { RouteMetadata } from "../components/RouteMetadata";

interface LegalPageProps {
  type: "privacy" | "terms";
}

export function LegalPage({ type }: LegalPageProps) {
  const isPrivacy = type === "privacy";
  return (
    <main className="min-h-screen bg-anm-page-gradient px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <RouteMetadata route={type} />
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-anm-gold">{isPrivacy ? "Privacy" : "Terms"}</p>
        <h1 className="mt-4 text-4xl font-black tracking-normal text-white sm:text-5xl">
          {isPrivacy ? "Privacy Policy" : "Terms of Use"}
        </h1>
        <div className="mt-8 rounded-md border border-white/12 bg-white/[0.055] p-6">
          <p className="text-base leading-7 text-white/74">
            {isPrivacy
              ? "The production privacy policy is managed as public site content. If this page is visible before final legal copy has been published, contact the site administrator for the approved policy."
              : "The production terms are managed as public site content. If this page is visible before final legal copy has been published, contact the site administrator for the approved terms."}
          </p>
          <p className="mt-4 text-sm text-white/50">
            This route is intentionally public, indexed according to published metadata, and does not expose admin settings or private media.
          </p>
        </div>
        <Link className="anm-focus mt-8 inline-flex rounded-md bg-anm-gold px-5 py-3 text-sm font-black text-ink" to="/contact">
          Contact Ascend Nexus Media
        </Link>
      </section>
    </main>
  );
}

