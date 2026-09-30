import type { LucideIcon } from "lucide-react";
import { Card } from "./ui/Card";

interface AboutFeatureCardProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
}

export function AboutFeatureCard({ icon: Icon, title, description }: AboutFeatureCardProps) {
  return (
    <Card as="article" variant="compact" interactive className="p-5">
      {Icon ? (
        <div className="grid h-11 w-11 place-items-center rounded-md border border-anm-gold/25 bg-anm-sunrise/14 text-anm-gold shadow-anm-sunrise-glow">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="mt-4 text-lg font-semibold text-white">{title || "Creative platform"}</h3>
      <p className="mt-2 text-sm leading-6 text-white/64">
        {description || "A developing Ascend Nexus Media capability with more public details coming soon."}
      </p>
    </Card>
  );
}
