import { Search } from "lucide-react";

export function ArtistDirectoryHero() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#090a0f_0%,#151827_46%,#311936_100%)] pt-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(243,91,185,.25),transparent_28%),radial-gradient(circle_at_18%_72%,rgba(247,177,74,.18),transparent_26%)]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">
            <Search className="h-4 w-4" aria-hidden="true" />
            Artist Directory
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Ascend Nexus Media Artists
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
            Meet the AI Persona Artists shaping the sound of Ascend Nexus Media.
          </p>
        </div>
      </div>
    </section>
  );
}
