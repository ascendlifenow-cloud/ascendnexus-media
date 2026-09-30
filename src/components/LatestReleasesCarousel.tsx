import { useEffect, useMemo, useRef, useState } from "react";
import type { ArtistReleaseGroup } from "../models/homepage";
import { CarouselControls } from "./CarouselControls";
import { EmptyState } from "./EmptyState";
import { SongCarouselCard } from "./songs";

interface LatestReleasesCarouselProps {
  releaseGroups: ArtistReleaseGroup[];
}

export function LatestReleasesCarousel({ releaseGroups }: LatestReleasesCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const items = useMemo(
    () => releaseGroups.flatMap((group) => group.releases.map((release) => ({ artist: group.artist, release }))),
    [releaseGroups],
  );

  const carouselItems = items.length > 1 ? [...items, ...items] : items;
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scrollByCard = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cardWidth = scroller.querySelector("article")?.clientWidth ?? 320;
    scroller.scrollBy({ left: direction * (cardWidth + 24), behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || items.length <= 1) return;

    const handleScroll = () => {
      const midpoint = scroller.scrollWidth / 2;
      if (scroller.scrollLeft >= midpoint) {
        scroller.scrollLeft -= midpoint;
      } else if (scroller.scrollLeft <= 0) {
        scroller.scrollLeft += midpoint;
      }
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, [items.length]);

  if (items.length === 0) {
    return <EmptyState title="No published releases yet" message="Published Ascend Nexus Media songs will appear here as soon as they are available." />;
  }

  return (
    <section id="latest-releases" className="scroll-mt-24 overflow-hidden bg-night py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Latest Releases</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-5xl">Newest songs by every active artist</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/66">
              The carousel surfaces up to three published releases per active persona, newest first.
            </p>
          </div>
          <CarouselControls onPrevious={() => scrollByCard(-1)} onNext={() => scrollByCard(1)} />
        </div>
        <div
          ref={scrollerRef}
          tabIndex={0}
          className="mt-10 flex snap-x gap-6 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] focus:outline-none focus:ring-2 focus:ring-cyanGlow/60 [&::-webkit-scrollbar]:hidden"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") scrollByCard(-1);
            if (event.key === "ArrowRight") scrollByCard(1);
          }}
          onPointerDown={(event) => {
            const scroller = scrollerRef.current;
            if (!scroller) return;
            setIsDragging(true);
            dragStartX.current = event.clientX;
            dragScrollLeft.current = scroller.scrollLeft;
            scroller.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const scroller = scrollerRef.current;
            if (!isDragging || !scroller) return;
            scroller.scrollLeft = dragScrollLeft.current - (event.clientX - dragStartX.current);
          }}
          onPointerUp={() => setIsDragging(false)}
          onPointerLeave={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
          aria-label="Latest releases carousel"
        >
          {carouselItems.map(({ artist, release }, index) => (
            <div key={`${release.releaseId}-${index}`} className="w-[82vw] shrink-0 snap-start sm:w-[23rem]">
              <SongCarouselCard artist={artist} release={release} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
