import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { memberEngagementApiService } from "../services/MemberEngagementApiService";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { CardGrid, Field, inputClass, PageHeader, Panel } from "./memberPageParts";

const resourceTitle = (record: Record<string, unknown>) => {
  const resource = record.resource as Record<string, unknown> | undefined;
  return String(resource?.title ?? record.name ?? record.title ?? "Saved item");
};

const ResourceList = ({ items, empty }: { items: Array<Record<string, unknown>>; empty: string }) => (
  <div className="space-y-3">
    {items.length ? items.map((item) => <div key={String(item.favoriteId ?? item.followId ?? item.historyId ?? item.notificationId ?? item.savedSearchId ?? item.collectionId ?? item.playlistId ?? item.feedbackId)} className="rounded-md border border-white/10 bg-black/20 p-4"><p className="font-semibold text-white">{resourceTitle(item)}</p><p className="mt-1 text-sm text-white/50">{String(item.status ?? item.createdAt ?? item.occurredAt ?? "")}</p></div>) : <p className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/58">{empty}</p>}
  </div>
);

export function MemberFavoritesPage() {
  const { dashboard, refreshDashboard } = useMemberPortal();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const load = () => memberEngagementApiService.favorites().then(setItems);
  useEffect(() => { void load(); }, []);
  const addFirstRelease = async () => {
    const release = dashboard.recentReleases[0];
    if (!release) return;
    await memberEngagementApiService.addFavorite({ resourceType: "release", resourceId: release.contentId, title: release.title, imageUrl: release.imageUrl, slug: release.href.split("/").pop() });
    await load();
    await refreshDashboard();
  };
  return <EngagementPage eyebrow="Favorites" title="Favorites" description="Save songs, releases, artists, galleries, playlists, and collections to your account." action={<Button onClick={addFirstRelease}>Favorite Latest Release</Button>} items={items} empty="No favorites yet." />;
}

export function MemberFollowingPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const load = () => memberEngagementApiService.following().then(setItems);
  useEffect(() => { void load(); }, []);
  const followEditorial = async () => {
    await memberEngagementApiService.follow({ resourceType: "collection", resourceId: "ascend-editorial", title: "Ascend Editorial" });
    await load();
  };
  return <EngagementPage eyebrow="Following" title="Following" description="Follow artists, albums, playlists, and collections." action={<Button onClick={followEditorial}>Follow Editorial Collection</Button>} items={items} empty="No follows yet." />;
}

export function MemberPlaylistsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("My Ascend Mix");
  const load = () => memberEngagementApiService.playlists().then(setItems);
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await memberEngagementApiService.createPlaylist({ name });
    await load();
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Playlists" title="Playlists">Create private playlists and prepare future sharing/collaboration.</PageHeader>
      <Panel title="Create playlist"><form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /><Button type="submit">Create</Button></form></Panel>
      <Panel title="Your playlists"><ResourceList items={items} empty="No playlists yet." /></Panel>
    </div>
  );
}

export function MemberHistoryPage() {
  const [data, setData] = useState<{ listening: Array<Record<string, unknown>>; viewing: Array<Record<string, unknown>> }>({ listening: [], viewing: [] });
  useEffect(() => { void memberEngagementApiService.history().then(setData); }, []);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="History" title="Listening and viewing history">Private playback and viewing records power continue-listening and recommendations.</PageHeader>
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Listening"><ResourceList items={data.listening} empty="No listening history yet." /></Panel>
        <Panel title="Viewing"><ResourceList items={data.viewing} empty="No viewing history yet." /></Panel>
      </section>
    </div>
  );
}

export function MemberNotificationsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const load = () => memberEngagementApiService.notifications().then(setItems);
  useEffect(() => { void load(); }, []);
  return <EngagementPage eyebrow="Notifications" title="Notification center" description="In-app notifications are active. Email, push, and digest delivery are readiness-enabled." items={items} empty="No notifications yet." />;
}

export function MemberFeedPage() {
  const { dashboard } = useMemberPortal();
  const [feed, setFeed] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { void memberEngagementApiService.feed().then(setFeed); }, []);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Personalized feed" title="Your feed">A member-owned summary of favorites, follows, playlists, history, notifications, early access, and recommendations.</PageHeader>
      <Panel title="Feed summary"><pre className="overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/70">{JSON.stringify(feed ?? {}, null, 2)}</pre></Panel>
      <Panel title="Recommended now"><CardGrid items={dashboard.recommendations} empty="No recommendations yet." /></Panel>
    </div>
  );
}

export function MemberSavedSearchesPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [query, setQuery] = useState("new releases");
  const load = () => memberEngagementApiService.savedSearches().then(setItems);
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await memberEngagementApiService.saveSearch({ name: query, query });
    await load();
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Saved searches" title="Saved searches">Save and rerun private search intents without exposing raw queries publicly.</PageHeader>
      <Panel title="Save search"><form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}><input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} /><Button type="submit">Save</Button></form></Panel>
      <Panel title="Your saved searches"><ResourceList items={items} empty="No saved searches yet." /></Panel>
    </div>
  );
}

export function MemberCollectionsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("Saved Collection");
  const load = () => memberEngagementApiService.collections().then(setItems);
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await memberEngagementApiService.createCollection({ name });
    await load();
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Collections" title="Collections">Organize favorite songs, albums, artists, galleries, videos, and playlists.</PageHeader>
      <Panel title="Create collection"><form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /><Button type="submit">Create</Button></form></Panel>
      <Panel title="Your collections"><ResourceList items={items} empty="No collections yet." /></Panel>
    </div>
  );
}

export function MemberRecommendationFeedbackPage() {
  const { dashboard } = useMemberPortal();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const load = () => memberEngagementApiService.feedback().then(setItems);
  useEffect(() => { void load(); }, []);
  const sendFeedback = async (action: "liked" | "hidden" | "not_interested" | "favorited") => {
    const item = dashboard.recommendations[0];
    if (!item) return;
    await memberEngagementApiService.recordFeedback({ resourceType: "release", resourceId: item.contentId, title: item.title, action });
    await load();
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Recommendation feedback" title="Recommendation feedback">Improve future recommendations with explicit member-owned feedback.</PageHeader>
      <Panel title="Quick feedback"><div className="flex flex-wrap gap-3"><Button onClick={() => sendFeedback("liked")}>Like Top Recommendation</Button><Button variant="secondary" onClick={() => sendFeedback("not_interested")}>Not Interested</Button></div></Panel>
      <Panel title="Feedback history"><ResourceList items={items} empty="No recommendation feedback yet." /></Panel>
    </div>
  );
}

function EngagementPage({ eyebrow, title, description, action, items, empty }: { eyebrow: string; title: string; description: string; action?: ReactNode; items: Array<Record<string, unknown>>; empty: string }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title}>{description}</PageHeader>
      {action ? <Panel>{action}</Panel> : null}
      <Panel><ResourceList items={items} empty={empty} /></Panel>
    </div>
  );
}
