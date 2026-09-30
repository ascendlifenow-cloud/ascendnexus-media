import { Archive, Globe2, Search, ShieldCheck } from "lucide-react";
import type { ReleasePublishReadiness, SongReleaseAdminRecord } from "../../../models/admin";

interface ReleasePublicationImpactProps {
  release: SongReleaseAdminRecord;
  readiness: ReleasePublishReadiness;
}

export function ReleasePublicationImpact({ release, readiness }: ReleasePublicationImpactProps) {
  const items = [
    { icon: Globe2, label: "Public page", value: readiness.ready ? "Ready after publish verification" : "Blocked until readiness passes" },
    { icon: Search, label: "Search and metadata", value: release.status === "published" ? "Refresh required after republish" : "Prepared on publish" },
    { icon: ShieldCheck, label: "Media safety", value: "Full-song and private media remain protected" },
    { icon: Archive, label: "Archive impact", value: "Removes release from public workflow after confirmation" },
  ];
  return (
    <section aria-label="Publication impact" className="rounded-anm-card border border-white/10 bg-white/[0.035] p-4">
      <h3 className="text-base font-semibold text-white">Publication Impact</h3>
      <div className="mt-3 grid gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex gap-3 text-sm">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/42" aria-hidden />
              <div>
                <p className="font-semibold text-white/78">{item.label}</p>
                <p className="text-white/52">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
