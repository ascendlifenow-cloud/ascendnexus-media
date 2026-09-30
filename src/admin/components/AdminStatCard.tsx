import type { ReactNode } from "react";
import { Card } from "../../components/ui/Card";

interface AdminStatCardProps {
  label: string;
  value: number | string;
  description?: string;
  icon?: ReactNode;
}

export function AdminStatCard({ label, value, description, icon }: AdminStatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/42">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        {icon ? <div className="rounded-md border border-white/10 bg-white/[0.07] p-2 text-anm-gold">{icon}</div> : null}
      </div>
      {description ? <p className="mt-4 text-sm leading-6 text-white/58">{description}</p> : null}
    </Card>
  );
}
