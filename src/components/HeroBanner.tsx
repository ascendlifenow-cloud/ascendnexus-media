import { ArrowDown, Music4 } from "lucide-react";
import heroStudio from "../assets/hero-studio.png";
import { BrandLogo } from "./BrandLogo";
import { LinkButton } from "./ui/LinkButton";
import { GlowPanel } from "./ui/GlowPanel";

export function HeroBanner() {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-anm-bg pt-24">
      <img src={heroStudio} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-anm-hero-gradient" />
      <div className="relative anm-container grid w-full gap-12 pb-16 pt-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.55fr)]">
        <div className="max-w-4xl">
          <BrandLogo />
          <h1 className="anm-hero-title mt-8 max-w-4xl">
            Ascend Nexus Media
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-cyan-50/84">
            Home to a growing collection of AI Persona Artists producing original music across cinematic pop,
            future soul, darkwave, and beyond.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/66">
            A public discovery platform for artist worlds, new releases, and the foundation of a larger digital
            music ecosystem.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LinkButton
              to="/artists"
              variant="primary"
              size="lg"
            >
              <Music4 className="h-4 w-4" aria-hidden="true" />
              Explore Artists
            </LinkButton>
            <a
              href="#latest-releases"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-6 text-sm font-bold text-white transition hover:bg-white/10 anm-focus"
            >
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
              Latest Releases
            </a>
          </div>
        </div>
        <div className="hidden items-end justify-end xl:flex">
          <GlowPanel tone="sunrise" className="w-full max-w-sm p-5">
            <p className="anm-meta text-anm-gold">Public Platform</p>
            <p className="mt-3 text-3xl font-semibold leading-tight text-white">Original AI persona music, released at the speed of imagination.</p>
          </GlowPanel>
        </div>
      </div>
    </section>
  );
}
