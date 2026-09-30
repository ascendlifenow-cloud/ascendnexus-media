import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { memberAuthApiService } from "../../services/member/MemberAuthApiService";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { Field, inputClass, PageHeader, Panel, type SubmitHandler } from "./memberPageParts";

export function MemberSecurityPage() {
  const { session } = useMemberPortal();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit: SubmitHandler = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage("");
    setError("");
    try {
      await memberAuthApiService.changePassword(String(form.get("currentPassword") ?? ""), String(form.get("newPassword") ?? ""));
      setMessage("Password changed. Existing member sessions have been revoked; sign in again to continue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed.");
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Security" title="Account security">Review verification status, change your password, and manage active sessions.</PageHeader>
      <Panel title="Security status">
        <div className="grid gap-3 sm:grid-cols-3">
          <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white/68"><span className="block font-semibold text-white">Email</span>{session.member.emailVerified ? "Verified" : "Verification required"}</p>
          <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white/68"><span className="block font-semibold text-white">Account</span>{session.member.status}</p>
          <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white/68"><span className="block font-semibold text-white">MFA</span>Readiness</p>
        </div>
      </Panel>
      <Panel title="Change password">
        <form className="space-y-5" onSubmit={submit}>
          <Field label="Current password"><input className={inputClass} name="currentPassword" type="password" autoComplete="current-password" /></Field>
          <Field label="New password"><input className={inputClass} name="newPassword" type="password" autoComplete="new-password" /></Field>
          <Button type="submit">Change Password</Button>
        </form>
        {message ? <p className="mt-4 text-sm text-cyan-100">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-100" role="alert">{error}</p> : null}
      </Panel>
    </div>
  );
}
