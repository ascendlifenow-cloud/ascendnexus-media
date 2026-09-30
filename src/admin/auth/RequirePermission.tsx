import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";

interface RequirePermissionProps {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
}

export function RequirePermission({ permission, anyOf, children }: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission } = useAdminAuth();
  const allowed = permission ? hasPermission(permission) : anyOf ? hasAnyPermission(anyOf) : true;
  return allowed ? <>{children}</> : <Navigate to="/admin/access-denied" replace />;
}
