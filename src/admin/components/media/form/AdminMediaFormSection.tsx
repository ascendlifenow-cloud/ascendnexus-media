import type { ReactNode } from "react";
import { Card } from "../../../../components/ui/Card";

interface AdminMediaFormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AdminMediaFormSection({ title, description, children }: AdminMediaFormSectionProps) {
  return (
    <Card as="section" className="p-5">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-white/58">{description}</p> : null}
      <div className="mt-5 grid gap-4">{children}</div>
    </Card>
  );
}
