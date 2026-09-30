import type { ReactNode } from "react";
import { ArrowRight, LockKeyhole, Search, Sparkles, UserRoundPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { SectionLoadingSkeleton } from "../components/loading";
import { RouteMetadata } from "../components/RouteMetadata";
import { SongCarouselCard } from "../components/songs/SongCarouselCard";
import { LinkButton } from "../components/ui/LinkButton";
import { usePublicLanding } from "../hooks/public";
import type { PublicLandingArtistCard, PublicLandingGalleryCard } from "../models/publicExperience";
import { cx } from "../utils/format";

export function LandingPage() {
  const { data, isLoading, isError } = usePublicLanding();

  return (
    <>
      <RouteMetadata route="home" />
      {isLoading ? (
        <section className="bg-night py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionLoadingSkeleton variant="hero" rows={3} cards={3} />
          </div>
        </section>
      ) : null}
      {isError ? (
        <section className="bg-night py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <EmptyState title="The public experience could not load" message="Please refresh the page to try again." />
          </div>
        </section>
      ) : null}
      {data ? (
        <main className="bg-night text-white">
          <section className="relative overflow-hidden border-b border-white/10 pt-28">
            {data.hero.imageUrl ? (
              <img src={data.hero.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-28" />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,18,0.96),rgba(5,8,18,0.72),rgba(5,8,18,0.88))]" />
            <div className="relative mx-auto flex min-h-[34rem] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.26em] text-cyanGlow">Public gateway</p>
                <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">{data.hero.headline}</h1>
                <p className="mt-6 max-w-2xl text-xl leading-8 text-white/76">{data.hero.subheadline}</p>
                {data.hero.body ? <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">{data.hero.body}</p> : null}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <LinkButton to={data.hero.primaryCta.href} variant="primary" size="lg">
                    {data.hero.primaryCta.label}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </LinkButton>
                  {data.hero.secondaryCta ? (
                    <LinkButton to={data.hero.secondaryCta.href} variant="secondary" size="lg">
                      {data.hero.secondaryCta.label}
                    </LinkButton>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <LandingBand title="Latest public releases" href="/songs" disabled={!data.latestReleases.length}>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.latestReleases.slice(0, 6).map((card) => (
                <SongCarouselCard key={card.release.releaseId} release={card.release} artist={card.artist} showAudioPreview={card.access.previewAvailable} />
              ))}
            </div>
          </LandingBand>

          {data.guestPreviews.length ? (
            <LandingBand title="Guest playable previews" href="/search">
              <div className="grid gap-4 md:grid-cols-2">
                {data.guestPreviews.slice(0, 4).map((card) => (
                  <SongCarouselCard key={card.release.releaseId} release={card.release} artist={card.artist} variant="compact" showAudioPreview />
                ))}
              </div>
            </LandingBand>
          ) : null}

          <LandingBand title="Featured artists" href="/artists" disabled={!data.featuredArtists.length}>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data.featuredArtists.slice(0, 8).map((card) => <ArtistCard key={card.artist.artistId} card={card} />)}
            </div>
          </LandingBand>

          <LandingBand title="Gallery preview" href="/gallery" disabled={!data.galleryPreview.length}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.galleryPreview.slice(0, 8).map((card) => <GalleryCard key={card.item.galleryItemId} card={card} />)}
            </div>
          </LandingBand>

          <section className="border-t border-white/10 bg-anm-bg py-14">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.7fr_1fr] lg:px-8">
              <div className="rounded-md border border-cyanGlow/20 bg-cyanGlow/8 p-6">
                <div className="flex items-center gap-3 text-cyanGlow">
                  <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                  <p className="text-sm font-bold uppercase tracking-[0.22em]">Tier-aware access</p>
                </div>
                <h2 className="mt-4 text-3xl font-semibold">{data.membershipTeaser.headline}</h2>
                <p className="mt-3 text-sm leading-6 text-white/62">{data.membershipTeaser.body}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <LinkButton to={data.membershipTeaser.registerHref} variant="primary">
                    <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                    Join
                  </LinkButton>
                  <LinkButton to={data.membershipTeaser.loginHref} variant="secondary">Sign in</LinkButton>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-semibold">Discover by sound and style</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[...data.discovery.genres, ...data.discovery.styleTags].slice(0, 28).map((tag) => (
                    <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} className="rounded-md border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white/78 transition hover:border-cyanGlow/50 hover:text-white">
                      {tag}
                    </Link>
                  ))}
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {data.discovery.routes.map((route) => (
                    <LinkButton key={route.href} to={route.href} variant="secondary" className="justify-between">
                      {route.label}
                      <Search className="h-4 w-4" aria-hidden="true" />
                    </LinkButton>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : null}
    </>
  );
}


function LandingBand({ title, href, disabled, children }: { title: string; href: string; disabled?: boolean; children: ReactNode }) {
  return (
    <section className="border-t border-white/10 bg-night py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyanGlow">Published content</p>
            <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
          </div>
          {!disabled ? <LinkButton to={href} variant="ghost">View all</LinkButton> : null}
        </div>
        {disabled ? <EmptyState title={`${title} is waiting for published content`} message="Only verified public records appear here." /> : children}
      </div>
    </section>
  );
}

function ArtistCard({ card }: { card: PublicLandingArtistCard }) {
  return (
    <Link to={`/artists/${card.artist.slug}`} className="group block overflow-hidden rounded-md border border-white/10 bg-white/6 transition hover:-translate-y-1 hover:border-cyanGlow/40">
      <div className="aspect-square bg-black/30">
        {card.artist.profileImage ? <img src={card.artist.profileImage} alt={`${card.artist.displayName} profile artwork`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyanGlow">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Public artist
        </div>
        <h3 className="mt-2 text-xl font-semibold">{card.artist.displayName}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/60">{card.artist.bio}</p>
      </div>
    </Link>
  );
}

function GalleryCard({ card }: { card: PublicLandingGalleryCard }) {
  const image = card.item.thumbnailUrl ?? card.item.imageUrl;
  return (
    <Link to={`/gallery/${card.item.slug}`} className={cx("group block overflow-hidden rounded-md border border-white/10 bg-white/6 transition hover:-translate-y-1 hover:border-cyanGlow/40", !image && "p-5")}>
      {image ? <img src={image} alt={card.item.altText || card.item.title} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/46">{card.item.mediaType.replace(/_/g, " ")}</p>
        <h3 className="mt-2 text-lg font-semibold">{card.item.title}</h3>
      </div>
    </Link>
  );
}
