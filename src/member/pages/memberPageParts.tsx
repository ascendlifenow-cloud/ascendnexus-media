import { Link } from "react-router-dom";
import type { FormEvent, ReactNode } from "react";
import type { MemberDashboardContentCard, MemberReadinessSummary } from "../services/memberPortalTypes";

export const PageHeader = ({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) => (
  <section className="mb-6">
    <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyanGlow">{eyebrow}</p>
    <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
    {children ? <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">{children}</p> : null}
  </section>
);

export const Panel = ({ title, children }: { title?: string; children: ReactNode }) => (
  <section className="rounded-md border border-white/10 bg-white/[0.045] p-5">
    {title ? <h2 className="text-xl font-semibold text-white">{title}</h2> : null}
    <div className={title ? "mt-4" : ""}>{children}</div>
  </section>
);

export const MemberAccessBadge = ({ label }: { label: string }) => (
  <span className="inline-flex rounded-full border border-cyanGlow/25 bg-cyanGlow/10 px-2.5 py-1 text-xs font-semibold text-cyan-50">{label}</span>
);

export const ContentCard = ({ item }: { item: MemberDashboardContentCard }) => (
  <Link to={item.href} className="group grid min-h-48 overflow-hidden rounded-md border border-white/10 bg-black/20 transition hover:border-cyanGlow/40">
    {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-32 w-full object-cover" loading="lazy" /> : <div className="h-32 bg-white/8" />}
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-white group-hover:text-cyan-50">{item.title}</h3>
        <MemberAccessBadge label={item.accessLabel} />
      </div>
      {item.subtitle ? <p className="mt-2 line-clamp-2 text-sm text-white/58">{item.subtitle}</p> : null}
      <p className="mt-3 text-xs text-white/42">{item.previewAvailable ? "Preview ready" : item.streamAvailable ? "Stream authorization on demand" : "Details available"}</p>
    </div>
  </Link>
);

export const CardGrid = ({ items, empty }: { items: MemberDashboardContentCard[]; empty: string }) => (
  items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <ContentCard key={`${item.contentType}-${item.contentId}`} item={item} />)}</div> : <p className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/58">{empty}</p>
);

export const ReadinessPanel = ({ summary }: { summary: MemberReadinessSummary }) => (
  <div className="rounded-md border border-white/10 bg-black/20 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold text-white">{summary.label}</h3>
      <MemberAccessBadge label={summary.status === "coming_soon" ? "Coming Soon" : summary.status} />
    </div>
    <p className="mt-2 text-sm leading-6 text-white/58">{summary.message}</p>
    {summary.href ? <Link to={summary.href} className="mt-3 inline-flex text-sm font-semibold text-cyanGlow hover:text-white">Open</Link> : null}
  </div>
);

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block text-sm font-semibold text-white/76">{label}<div className="mt-2">{children}</div></label>
);

export const inputClass = "w-full rounded-md border border-white/10 bg-black/28 px-3 py-3 text-white outline-none transition focus:border-cyanGlow";

export type SubmitHandler = (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
