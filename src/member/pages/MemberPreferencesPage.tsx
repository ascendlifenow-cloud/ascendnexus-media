import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { memberDashboardApiService } from "../services/MemberDashboardApiService";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { Field, inputClass, PageHeader, Panel, type SubmitHandler } from "./memberPageParts";

export function MemberPreferencesPage() {
  const { session, refreshDashboard } = useMemberPortal();
  const preferences = session.member.preferences;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit: SubmitHandler = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await memberDashboardApiService.updatePreferences({
        notifications: {
          newReleases: form.get("newReleases") === "on",
          artistUpdates: form.get("artistUpdates") === "on",
          newsletter: form.get("newsletter") === "on",
          marketing: form.get("marketing") === "on",
          systemNotifications: form.get("systemNotifications") === "on",
          securityAlerts: true,
        },
        privacy: {
          publicProfile: form.get("publicProfile") === "on",
          showFavorites: form.get("showFavorites") === "on",
        },
        timezone: String(form.get("timezone") ?? ""),
        language: String(form.get("language") ?? ""),
      });
      await refreshDashboard();
      setMessage("Preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preferences update failed.");
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Preferences" title="Content, privacy, and notifications">Preferences are stored server-side and influence recommendations only where implemented.</PageHeader>
      <Panel>
        <form className="space-y-6" onSubmit={submit}>
          <section className="grid gap-3 sm:grid-cols-2">
            {[
              ["newReleases", "New releases", preferences.notifications.newReleases],
              ["artistUpdates", "Artist updates", preferences.notifications.artistUpdates],
              ["newsletter", "Newsletter", preferences.notifications.newsletter],
              ["marketing", "Marketing", preferences.notifications.marketing],
              ["systemNotifications", "System notifications", preferences.notifications.systemNotifications],
              ["publicProfile", "Public profile readiness", preferences.privacy.publicProfile],
              ["showFavorites", "Show favorites readiness", preferences.privacy.showFavorites],
            ].map(([name, label, checked]) => <label key={String(name)} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/18 p-3 text-sm text-white/72"><input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} /> {label}</label>)}
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Timezone readiness"><input className={inputClass} name="timezone" defaultValue={preferences.timezone ?? ""} placeholder="America/Denver" /></Field>
            <Field label="Language readiness"><input className={inputClass} name="language" defaultValue={preferences.language ?? ""} placeholder="en" /></Field>
          </section>
          <Button type="submit">Save Preferences</Button>
        </form>
        {message ? <p className="mt-4 text-sm text-cyan-100">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-100" role="alert">{error}</p> : null}
      </Panel>
    </div>
  );
}
