import { ArtistCardSkeleton } from "./ArtistCardSkeleton";
import { skeletonBlockClassName } from "./skeletonUtils";
import { SongCardSkeleton } from "./SongCardSkeleton";

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-12" aria-busy="true">
      <span className="sr-only">Loading search results</span>
      <div className={skeletonBlockClassName("h-12 w-full", "blue")} aria-hidden="true" />
      <section aria-hidden="true">
        <div className={skeletonBlockClassName("h-7 w-52", "sunrise")} />
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <ArtistCardSkeleton key={index} variant="directory" />
          ))}
        </div>
      </section>
      <section aria-hidden="true">
        <div className={skeletonBlockClassName("h-7 w-48", "pink")} />
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SongCardSkeleton key={index} variant="grid" />
          ))}
        </div>
      </section>
    </div>
  );
}
