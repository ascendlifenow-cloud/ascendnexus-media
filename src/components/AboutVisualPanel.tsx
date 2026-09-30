import { Disc3, Image, Mic2, Orbit, Sparkles } from "lucide-react";
import { Badge } from "./ui/Badge";
import { GlowPanel } from "./ui/GlowPanel";

const visualNodes = [
  { label: "Artist Identity", icon: Sparkles, tone: "text-anm-blue" },
  { label: "Songs", icon: Mic2, tone: "text-anm-gold" },
  { label: "Cover Art", icon: Image, tone: "text-anm-pink" },
  { label: "Ecosystem", icon: Orbit, tone: "text-anm-lavender" },
];

export function AboutVisualPanel() {
  return (
    <GlowPanel tone="purple" className="p-6 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <Badge variant="glass">Creative System</Badge>
        <Disc3 className="h-6 w-6 text-anm-gold" aria-hidden="true" />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {visualNodes.map((node) => (
          <div key={node.label} className="rounded-md border border-white/10 bg-black/18 p-4">
            <node.icon className={`h-5 w-5 ${node.tone}`} aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-white">{node.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-md border border-white/10 bg-gradient-to-br from-anm-purple/20 via-anm-pink/12 to-anm-sunrise/16 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/52">Connected Universe</p>
        <p className="mt-3 text-sm leading-6 text-white/72">
          Each release can carry artist lore, sonic direction, cover imagery, preview audio, and future media assets
          through one public-facing creative layer.
        </p>
      </div>
    </GlowPanel>
  );
}
