import { Badge } from "../ui/Badge";

export function BrowseHero() {
  return (
    <div className="max-w-4xl">
      <Badge variant="sunrise" className="uppercase tracking-[0.18em]">
        Catalog Browse
      </Badge>
      <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-6xl">Browse the Sound</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 sm:text-lg">
        Explore Ascend Nexus Media releases by genre, mood, energy, and creative style.
      </p>
    </div>
  );
}
