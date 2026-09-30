import { Badge } from "../ui/Badge";

export function ReleasesCatalogHero() {
  return (
    <div className="max-w-4xl">
      <Badge variant="sunrise" className="uppercase tracking-[0.18em]">
        Music Catalog
      </Badge>
      <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-6xl">
        Ascend Nexus Media Releases
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-white/70 sm:text-lg">
        Browse the complete catalog of published songs from Ascend Nexus Media AI Persona Artists.
      </p>
    </div>
  );
}
