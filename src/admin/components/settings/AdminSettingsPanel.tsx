import type { ReactNode } from "react";
import { AdminSectionCard } from "../AdminSectionCard";

interface AdminSettingsPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AdminSettingsPanel({ title, description, children }: AdminSettingsPanelProps) {
  return (
    <AdminSectionCard title={title} description={description}>
      {children}
    </AdminSectionCard>
  );
}
