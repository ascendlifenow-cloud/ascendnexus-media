import { analyticsEventRepository } from "../../repositories/AnalyticsEventRepository";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { distributionAnalyticsRepository, artistIntelligenceSnapshotRepository, intelligenceInsightRepository } from "../../repositories/operations/OperationsRepository";
import type { IntelligencePeriod } from "../../models/operations/OperationsModels";
import { eventCount, id, metric, nowIso, periodRange, scoreRelease } from "./intelligenceShared";

export class ArtistIntelligenceService {
  async buildArtistProfile(artistId: string, period: IntelligencePeriod = "week") {
    const [artist, releases, events, distributionAnalytics] = await Promise.all([
      artistRepository.get(artistId),
      releaseRepository.list({ includeArchived: true }),
      analyticsEventRepository.list({ includeArchived: true }),
      distributionAnalyticsRepository.list({ includeArchived: true }),
    ]);
    if (!artist) throw new Error("Artist not found.");
    const artistReleases = releases.filter((release) => release.artistId === artistId);
    const releaseIds = new Set(artistReleases.map((release) => release.releaseId));
    const artistEvents = events.filter((event) => event.entityId === artistId || (event.entityType === "release" && releaseIds.has(event.entityId ?? "")));
    const topSongs = artistReleases
      .map((release) => ({ releaseId: release.releaseId, title: release.title, score: scoreRelease(release.releaseId, artistEvents, distributionAnalytics) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    const generatedAt = nowIso();
    const range = periodRange(period === "custom" ? "week" : period);
    const snapshot = await artistIntelligenceSnapshotRepository.create({
      intelligenceSnapshotId: id("artist_intel"),
      artistId,
      period,
      ...range,
      audience: {
        views: eventCount(artistEvents, (event) => event.eventName.includes("view")),
        returningVisitors: eventCount(artistEvents, (event) => Boolean(event.properties?.returningVisitor)),
        followers: metric(distributionAnalytics, "followers"),
        subscribers: metric(distributionAnalytics, "subscribers"),
      },
      contentPerformance: {
        releaseCount: artistReleases.length,
        publishedReleaseCount: artistReleases.filter((release) => release.status === "published").length,
        streams: metric(distributionAnalytics, "streams"),
        likes: metric(distributionAnalytics, "likes"),
        shares: metric(distributionAnalytics, "shares"),
        comments: metric(distributionAnalytics, "comments"),
      },
      platformPerformance: this.platformScores(distributionAnalytics),
      seoPerformance: {
        searchEvents: eventCount(artistEvents, (event) => event.routeKey.includes("search") || event.eventName.includes("search")),
        seoClicks: eventCount(artistEvents, (event) => event.properties?.source === "seo"),
      },
      revenueReadiness: { status: "future", revenueTracked: 0 },
      topSongs,
      topVideos: [],
      topAlbums: artistReleases.filter((release) => release.metadata?.releaseType === "album").map((release) => ({ releaseId: release.releaseId, title: release.title, score: scoreRelease(release.releaseId, artistEvents, distributionAnalytics) })).slice(0, 5),
      recommendations: this.recommendationsFor(artistReleases.length, topSongs[0]?.score ?? 0),
      generatedAt,
      createdAt: generatedAt,
      metadata: { artistName: artist.name },
      schemaVersion: 1,
    });
    return { artist, snapshot };
  }

  async buildGlobalDashboard() {
    const [artists, releases, events, analytics, insights] = await Promise.all([
      artistRepository.list({ includeArchived: true }),
      releaseRepository.list({ includeArchived: true }),
      analyticsEventRepository.list({ includeArchived: true }),
      distributionAnalyticsRepository.list({ includeArchived: true }),
      intelligenceInsightRepository.list({ includeArchived: true, sort: "detectedAt", direction: "desc", limit: 20 }),
    ]);
    const artistScores = artists.map((artist) => {
      const artistReleases = releases.filter((release) => release.artistId === artist.artistId);
      const score = artistReleases.reduce((sum, release) => sum + scoreRelease(release.releaseId, events, analytics), 0) + eventCount(events, (event) => event.entityId === artist.artistId);
      return { artistId: artist.artistId, name: artist.name, score, releaseCount: artistReleases.length };
    }).sort((a, b) => b.score - a.score);
    const releaseScores = releases.map((release) => ({ releaseId: release.releaseId, title: release.title, artistId: release.artistId, score: scoreRelease(release.releaseId, events, analytics) })).sort((a, b) => b.score - a.score);
    return {
      topArtists: artistScores.slice(0, 10),
      fastestGrowingArtists: artistScores.filter((item) => item.score > 0).slice(0, 10),
      topSongs: releaseScores.slice(0, 10),
      topAlbums: releaseScores.filter((release) => releases.find((item) => item.releaseId === release.releaseId)?.metadata?.releaseType === "album").slice(0, 10),
      topVideos: [],
      topPlatforms: Object.entries(this.platformScores(analytics)).map(([platform, score]) => ({ platform, score })).sort((a, b) => b.score - a.score),
      websiteGrowth: eventCount(events, (event) => event.routeKey === "homepage" || event.path === "/"),
      seoGrowth: eventCount(events, (event) => event.properties?.source === "seo"),
      followerGrowth: metric(analytics, "followers") + metric(analytics, "subscribers"),
      releaseVelocity: releases.filter((release) => release.createdAt >= periodRange("month").periodStart).length,
      publishingSuccess: releases.filter((release) => release.status === "published").length,
      revenueReadiness: "future",
      insights,
      checkedAt: nowIso(),
    };
  }

  private platformScores(records: Awaited<ReturnType<typeof distributionAnalyticsRepository.list>>) {
    return records.reduce<Record<string, number>>((scores, record) => {
      scores[record.platform] = (scores[record.platform] ?? 0) + metric([record], "views") + metric([record], "streams") * 2 + metric([record], "likes") + metric([record], "shares") * 3;
      return scores;
    }, {});
  }

  private recommendationsFor(releaseCount: number, topScore: number) {
    const recommendations = [];
    if (releaseCount === 0) recommendations.push("Create first release and distribution plan.");
    if (topScore > 20) recommendations.push("Promote top-performing release with a homepage feature and social variants.");
    if (topScore === 0 && releaseCount > 0) recommendations.push("Create Shorts/Reels and refresh metadata to improve discovery.");
    recommendations.push("Review artwork, SEO description, and platform captions before next release.");
    return recommendations;
  }
}

export const artistIntelligenceService = new ArtistIntelligenceService();
