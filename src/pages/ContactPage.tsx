import {
  ContactHero,
  ExploreMoreCards,
  FollowLinksSection,
  InquiryCTASection,
} from "../components/contact";
import { EmptyState } from "../components/EmptyState";
import { PublicContactForm } from "../components/forms/PublicContactForm";
import { PublicNewsletterSignupForm } from "../components/forms/PublicNewsletterSignupForm";
import { SectionLoadingSkeleton } from "../components/loading";
import { RouteMetadata } from "../components/RouteMetadata";
import { useContactPage } from "../hooks/useContactPage";

export function ContactPage() {
  const { data: config, isLoading, isError } = useContactPage();

  return (
    <main className="min-h-screen bg-ink">
      <RouteMetadata route="contact" />
      <ContactHero />

      {isLoading ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionLoadingSkeleton rows={3} cards={3} />
        </section>
      ) : null}

      {isError ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <EmptyState title="Contact page could not load" message="Please refresh the page and try again." />
        </section>
      ) : null}

      {!isLoading && !isError && config ? (
        <>
          <FollowLinksSection links={config.followLinks} />
          <InquiryCTASection body={config.contactCtaText} links={config.followLinks} />
          <PublicContactForm />
          <PublicNewsletterSignupForm />
          <ExploreMoreCards links={config.exploreLinks} />
        </>
      ) : null}
    </main>
  );
}
