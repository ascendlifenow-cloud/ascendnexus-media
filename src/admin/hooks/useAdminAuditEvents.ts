import { useQuery } from "@tanstack/react-query";
import { adminAuditService } from "../../services/admin";

export const adminAuditKeys = {
  all: ["admin-audit"] as const,
  lists: () => [...adminAuditKeys.all, "list"] as const,
};

export const useAdminAuditEvents = () =>
  useQuery({
    queryKey: adminAuditKeys.lists(),
    queryFn: () => adminAuditService.listEvents(),
  });
