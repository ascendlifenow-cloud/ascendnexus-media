import { Link } from "react-router-dom";
import { RouteMetadata } from "../components/RouteMetadata";
import { usePublicHomepage } from "../hooks/public";

const getText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function AboutPage() {
  const { data } = usePublicHomepage();
  const aboutSection = (data as { sections?: Array<{ sectionType?: string; title?: string; subtitle?: string; configuration?: Record<string, unknown> }> } | undefined)?.sections?.find(
    (section) => section.sectionType === "about",
  );
  const title = getText(aboutSection?.title) || "About Ascend Nexus Media";
  const body =
    getText(aboutSection?.configuration?.body) ||
    getText(aboutSection?.subtitle) ||
    "Ascend Nexus Media publishes AI persona artists, original releases, and visual media through the production content management system.";

  return (
    <main className="min-h-screen bg-anm-page-gradient px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <RouteMetadata route="about" />
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-anm-gold">About</p>
        <h1 className="mt-4 text-4xl font-black tracking-normal text-white sm:text-5xl">{title}</h1>
        <p className="mt-6 text-lg leading-8 text-white/72">{body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="anm-focus rounded-md bg-anm-gold px-5 py-3 text-sm font-black text-ink" to="/artists">
            Explore Artists
          </Link>
          <Link className="anm-focus rounded-md border border-white/15 px-5 py-3 text-sm font-bold text-white" to="/songs">
            Browse Songs
          </Link>
        </div>
      </section>
    </main>
  );
}

