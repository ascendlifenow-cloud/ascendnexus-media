import type { ReactNode } from "react";
import { AdminStatusBadge } from "./AdminStatusBadge";

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  status?: "ready" | "planned" | "mock" | "disabled";
  actions?: ReactNode;
}

export function AdminPageHeader({ eyebrow = "Admin", title, description, status = "mock", actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-anm-gold">{eyebrow}</p>
          <AdminStatusBadge status={status} />
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62 sm:text-base">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
