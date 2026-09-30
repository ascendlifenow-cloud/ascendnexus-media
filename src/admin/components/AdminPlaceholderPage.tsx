import { CheckCircle2 } from "lucide-react";
import { AdminActionButton } from "./AdminActionButton";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminSectionCard } from "./AdminSectionCard";

interface AdminPlaceholderPageProps {
  title: string;
  description: string;
  futureActions: string[];
}

export function AdminPlaceholderPage({ title, description, futureActions }: AdminPlaceholderPageProps) {
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={title} description={description} status="planned" />
      <AdminSectionCard title="Ready for CRUD expansion" description="This section is routed, styled, and prepared for future management workflows.">
        <ul className="grid gap-3">
          {futureActions.map((action) => (
            <li key={action} className="flex gap-3 rounded-md border border-white/10 bg-white/[0.045] p-3 text-sm text-white/68">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-anm-success" aria-hidden />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </AdminSectionCard>
      <AdminActionButton to="/admin/dashboard">Back to Dashboard</AdminActionButton>
    </div>
  );
}
