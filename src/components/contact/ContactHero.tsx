import { Badge } from "../ui/Badge";

export function ContactHero() {
  return (
    <section className="relative overflow-hidden bg-anm-page-gradient pt-32">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_20%_20%,rgba(243,91,185,.18),transparent_28%),radial-gradient(circle_at_72%_10%,rgba(86,215,255,.16),transparent_26%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <Badge variant="sunrise" className="uppercase tracking-[0.18em]">
            Ascend Nexus Media
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Contact & Follow Ascend Nexus Media
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/70 sm:text-lg">
            Stay connected with the latest AI Persona Artist releases, visuals, stories, and creative updates.
          </p>
        </div>
      </div>
    </section>
  );
}
