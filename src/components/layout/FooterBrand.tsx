import { NavLogo } from "./NavLogo";

export function FooterBrand() {
  return (
    <section aria-label="Ascend Nexus Media" className="max-w-md">
      <NavLogo />
      <p className="mt-5 text-sm leading-7 text-white/66">
        Ascend Nexus Media is home to AI Persona Artists creating original songs, stories, visuals, and evolving
        digital music experiences.
      </p>
      <p className="mt-4 text-sm leading-6 text-cyan-100/72">
        Built for discovery, release storytelling, and the next generation of creative music identities.
      </p>
    </section>
  );
}
