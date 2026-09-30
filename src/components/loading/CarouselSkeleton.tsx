import { SongCardSkeleton } from "./SongCardSkeleton";

interface CarouselSkeletonProps {
  itemCount?: number;
  label?: string;
  className?: string;
}

export function CarouselSkeleton({ itemCount = 4, label = "Loading carousel", className }: CarouselSkeletonProps) {
  return (
    <div className={className} aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="flex gap-5 overflow-hidden" aria-hidden="true">
        {Array.from({ length: itemCount }).map((_, index) => (
          <SongCardSkeleton key={index} variant="carousel" className="min-w-[78%] sm:min-w-[42%] lg:min-w-[24%]" />
        ))}
      </div>
    </div>
  );
}
