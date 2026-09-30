import type { ProcessingTabKey } from "../../../utils/mediaProcessingAdminUtils";

interface Props {
  activeTab: ProcessingTabKey;
  counts: Record<ProcessingTabKey, number>;
  onChange: (tab: ProcessingTabKey) => void;
}

const tabs: ProcessingTabKey[] = ["active", "queued", "failed", "dead_letter", "completed", "all"];

const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export function AdminProcessingJobTabs({ activeTab, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Processing job status filters">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          className={`rounded-md border px-3 py-2 text-sm ${activeTab === tab ? "border-anm-gold bg-anm-gold/15 text-white" : "border-white/10 text-white/64 hover:border-white/25"}`}
          onClick={() => onChange(tab)}
        >
          {label(tab)} <span className="text-white/45">{counts[tab]}</span>
        </button>
      ))}
    </div>
  );
}
