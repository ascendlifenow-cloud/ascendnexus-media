import type { ReactNode } from "react";
import { Card } from "../../components/ui/Card";

interface AdminSectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AdminSectionCard({ title, description, children }: AdminSectionCardProps) {
  return (
    <Card as="section" className="p-5">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-white/60">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </Card>
  );
}
