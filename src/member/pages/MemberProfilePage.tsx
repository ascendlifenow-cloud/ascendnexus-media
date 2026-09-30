import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { memberDashboardApiService } from "../services/MemberDashboardApiService";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { Field, inputClass, PageHeader, Panel, type SubmitHandler } from "./memberPageParts";

export function MemberProfilePage() {
  const { session, refreshDashboard } = useMemberPortal();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit: SubmitHandler = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await memberDashboardApiService.updateProfile({
        displayName: String(form.get("displayName") ?? ""),
        avatar: String(form.get("avatar") ?? ""),
        bio: String(form.get("bio") ?? ""),
      });
      await refreshDashboard();
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile update failed.");
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Profile" title="Member profile">Manage your display profile. Public profile exposure remains controlled by privacy settings.</PageHeader>
      <Panel>
        <form className="space-y-5" onSubmit={submit}>
          <Field label="Display name"><input className={inputClass} name="displayName" defaultValue={session.member.displayName} maxLength={80} /></Field>
          <Field label="Avatar URL readiness"><input className={inputClass} name="avatar" defaultValue={session.member.avatar ?? ""} placeholder="Secure avatar upload readiness" /></Field>
          <Field label="Biography readiness"><textarea className={inputClass} name="bio" defaultValue={session.member.bio ?? ""} rows={5} maxLength={500} /></Field>
          <Button type="submit">Save Profile</Button>
        </form>
        {message ? <p className="mt-4 text-sm text-cyan-100">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-100" role="alert">{error}</p> : null}
      </Panel>
    </div>
  );
}
