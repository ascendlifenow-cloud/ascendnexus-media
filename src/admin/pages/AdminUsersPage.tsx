import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, RotateCcw, ShieldOff, Users } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { adminUsersApiService, type AdminRoleSummary } from "../services/AdminUsersApiService";
import type { AdminUserSession } from "../services/AdminAuthApiService";

const emptyForm = {
  email: "",
  displayName: "",
  password: "",
  role: "viewer",
};

export function AdminUsersPage() {
  const { hasPermission } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserSession[]>([]);
  const [roles, setRoles] = useState<AdminRoleSummary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = hasPermission("users.create");
  const canDisable = hasPermission("users.disable");
  const canRestore = hasPermission("users.restore");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextUsers, nextRoles] = await Promise.all([
        adminUsersApiService.listUsers(),
        adminUsersApiService.listRoles(),
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const roleOptions = useMemo(() => roles.filter((role) => role.roleId !== "super_admin"), [roles]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminUsersApiService.createUser({
        email: form.email,
        displayName: form.displayName || form.email,
        password: form.password,
        roles: [form.role],
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create admin user.");
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (user: AdminUserSession) => {
    setError(null);
    try {
      if (user.status === "disabled") await adminUsersApiService.restoreUser(user.userId);
      else await adminUsersApiService.disableUser(user.userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update admin user.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Access Control"
        title="Admin Users"
        description="Manage administrator accounts, roles, and account access."
        status="ready"
        actions={<Users className="h-6 w-6 text-anm-blue" aria-hidden />}
      />
      {error ? <div className="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <AdminSectionCard title="Users" description={loading ? "Loading secure admin users..." : `${users.length} admin account${users.length === 1 ? "" : "s"}`}>
          <div className="overflow-hidden rounded-md border border-white/10">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-white/[0.055] text-xs uppercase tracking-[0.18em] text-white/50">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => (
                  <tr key={user.userId} className="bg-white/[0.025]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{user.displayName}</p>
                      <p className="text-xs text-white/50">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-white/70">{user.roles.join(", ")}</td>
                    <td className="px-4 py-3"><Badge variant={user.status === "active" ? "glass" : "sunrise"}>{user.status}</Badge></td>
                    <td className="px-4 py-3 text-white/56">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                    <td className="px-4 py-3 text-right">
                      {(user.status === "disabled" ? canRestore : canDisable) ? (
                        <Button type="button" variant="glass" size="sm" onClick={() => void toggleUser(user)}>
                          {user.status === "disabled" ? <RotateCcw className="h-4 w-4" aria-hidden /> : <ShieldOff className="h-4 w-4" aria-hidden />}
                          {user.status === "disabled" ? "Restore" : "Disable"}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Create User" description="Create a secure admin account with a starting role.">
          <form className="grid gap-4" onSubmit={createUser}>
            <label className="grid gap-2 text-sm font-semibold text-white/74">
              Email
              <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} disabled={!canCreate} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white/74">
              Display name
              <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} disabled={!canCreate} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white/74">
              Temporary password
              <input className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-white outline-none focus:border-anm-blue" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} disabled={!canCreate} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white/74">
              Role
              <select className="rounded-md border border-white/10 bg-anm-bg-soft px-3 py-2 text-white outline-none focus:border-anm-blue" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} disabled={!canCreate}>
                {roleOptions.map((role) => <option key={role.roleId} value={role.roleId}>{role.displayName}</option>)}
              </select>
            </label>
            <Button type="submit" disabled={!canCreate} isLoading={saving}>
              <Plus className="h-4 w-4" aria-hidden />
              Create user
            </Button>
          </form>
        </AdminSectionCard>
      </div>
    </div>
  );
}
