export interface AdminBootstrapState {
  bootstrapStateId: string;
  bootstrapRequired: boolean;
  bootstrapCompleted: boolean;
  initialAdministratorId?: string;
  completedAt?: string;
  completedByMethod?: "cli_activation" | "manual_recovery";
  bootstrapVersion: number;
  lockId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
