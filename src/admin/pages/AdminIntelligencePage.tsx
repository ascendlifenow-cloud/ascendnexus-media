import { Brain, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useIntelligenceOverview } from "../hooks/useIntelligenceOverview";

const record = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};
const list = (value: unknown) => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "unknown") => typeof value === "string" && value ? value : fallback;
const num = (value: unknown) => typeof value === "number" ? value : 0;

function Table({ rows, columns }: { rows: unknown[]; columns: Array<{ key: string; label: string }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-white/45"><tr>{columns.map((column) => <th className="px-3 py-2" key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/10">
          {rows.slice(0, 10).map((row, index) => {
            const item = record(row);
            return <tr className="text-white/72" key={String(item.artistId ?? item.releaseId ?? item.platform ?? item.insightId ?? item.forecastId ?? item.intelligenceReportId ?? index)}>{columns.map((column) => <td className="px-3 py-2 align-top" key={column.key}>{String(item[column.key] ?? "—")}</td>)}</tr>;
          })}
        </tbody>
      </table>
      {!rows.length ? <p className="px-3 py-4 text-sm text-white/55">No records yet.</p> : null}
    </div>
  );
}

export function AdminIntelligencePage({ focus = "overview" }: { focus?: string }) {
  const { overview, audience, platforms, content, forecasts, reports, loading, errors, refresh, generateInsights } = useIntelligenceOverview();
  const dashboard = record(overview?.dashboard);
  const insights = list(dashboard.insights);
  const platformRows = list(platforms?.platforms ?? record(overview?.platforms).platforms);
  const topArtists = list(dashboard.topArtists);
  const topSongs = list(record(content).topSongs ?? dashboard.topSongs);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Intelligence"
        title={focus === "overview" ? "Artist Intelligence" : focus.replace(/-/g, " ")}
        status="ready"
        description="Measure artist growth, audience behavior, platform performance, release trends, recommendations, forecasts, and executive reports."
        actions={<div className="flex flex-wrap gap-2"><Button variant="glass" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" aria-hidden />Refresh</Button><Button variant="primary" onClick={() => void generateInsights()}><Sparkles className="h-4 w-4" aria-hidden />Generate Insights</Button></div>}
      />

      {loading ? <p className="text-sm text-white/62">Loading intelligence state...</p> : null}
      {errors.length ? <AdminSectionCard title="API Errors"><ul className="space-y-2 text-sm text-red-100">{errors.map((error) => <li key={error}>{error}</li>)}</ul></AdminSectionCard> : null}

      <div className="grid gap-5 lg:grid-cols-4">
        <AdminSectionCard title="Website Growth"><p className="text-3xl font-semibold text-white">{num(dashboard.websiteGrowth)}</p><p className="text-sm text-white/55">homepage interactions</p></AdminSectionCard>
        <AdminSectionCard title="Follower Growth"><p className="text-3xl font-semibold text-white">{num(dashboard.followerGrowth)}</p><p className="text-sm text-white/55">followers/subscribers</p></AdminSectionCard>
        <AdminSectionCard title="Release Velocity"><p className="text-3xl font-semibold text-white">{num(dashboard.releaseVelocity)}</p><p className="text-sm text-white/55">new releases this month</p></AdminSectionCard>
        <AdminSectionCard title="SEO Growth"><p className="text-3xl font-semibold text-white">{num(dashboard.seoGrowth)}</p><p className="text-sm text-white/55">tracked SEO events</p></AdminSectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard title="Top Artists"><Table rows={topArtists} columns={[{ key: "name", label: "Artist" }, { key: "score", label: "Score" }, { key: "releaseCount", label: "Releases" }]} /></AdminSectionCard>
        <AdminSectionCard title="Top Songs"><Table rows={topSongs} columns={[{ key: "title", label: "Song" }, { key: "artistId", label: "Artist ID" }, { key: "score", label: "Score" }]} /></AdminSectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard title="Audience Growth" description="Consent-controlled audience metrics only.">
          <div className="grid gap-3 text-sm text-white/72 md:grid-cols-2">
            <p className="rounded border border-white/10 p-3">This week <strong>{num(audience?.thisWeek)}</strong></p>
            <p className="rounded border border-white/10 p-3">This month <strong>{num(audience?.thisMonth)}</strong></p>
            <p className="rounded border border-white/10 p-3">Returning visitors <strong>{num(audience?.returningVisitors)}</strong></p>
            <p className="rounded border border-white/10 p-3">Followers <strong>{num(audience?.followers)}</strong></p>
          </div>
        </AdminSectionCard>
        <AdminSectionCard title="Platform Comparison">
          <Table rows={platformRows} columns={[{ key: "platform", label: "Platform" }, { key: "status", label: "Status" }, { key: "score", label: "Score" }, { key: "followers", label: "Followers" }]} />
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="AI Insights & Recommendations">
        <div className="space-y-3">
          {insights.slice(0, 8).map((insight, index) => {
            const item = record(insight);
            return <p className="rounded border border-white/10 p-3 text-sm text-white/72" key={String(item.insightId ?? index)}><Brain className="mr-2 inline h-4 w-4 text-anm-gold" aria-hidden /> <strong>{text(item.title)}</strong><br />{text(item.summary, "")}</p>;
          })}
          {!insights.length ? <p className="text-sm text-white/55">Generate insights to populate recommendations.</p> : null}
        </div>
      </AdminSectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard title="Growth Forecasts"><Table rows={forecasts} columns={[{ key: "metric", label: "Metric" }, { key: "currentValue", label: "Current" }, { key: "forecastValue", label: "Forecast" }, { key: "confidence", label: "Confidence" }]} /></AdminSectionCard>
        <AdminSectionCard title="Reports"><Table rows={reports} columns={[{ key: "reportType", label: "Type" }, { key: "summary", label: "Summary" }, { key: "generatedAt", label: "Generated" }]} /></AdminSectionCard>
      </div>
    </div>
  );
}
