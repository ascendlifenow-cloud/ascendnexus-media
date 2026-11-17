import { useEffect, useId, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { publicationAudiences, type AdminReleaseFormState } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, SelectInput } from "./AdminReleaseFormControls";
import { Button } from "../../../../components/ui/Button";
import { AdminRightShelf } from "../../AdminRightShelf";
import { songMixes } from "../../../../models/songMixes";

interface AdminReleasePublicationTargetsProps {
  state: AdminReleaseFormState;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

const audienceLabels = {
  public: "Public (including guests)",
  free: "Registered Free and above",
  premium: "Premium and above",
  supporter: "Supporter and above",
  vip: "VIP",
};

export function PublicationTargetFields({ state, updateField }: AdminReleasePublicationTargetsProps) {
  const id = useId();
  return (
    <fieldset className="grid min-w-0 gap-4 border-t border-white/10 pt-5">
      <legend className="text-lg font-semibold text-white">Audience & Website Sections</legend>
      <FieldShell label="Minimum Audience" htmlFor={`${id}-audience`}
        error={state.publicationAudience === "" ? "Select a valid minimum audience before saving." : undefined}>
        <SelectInput id={`${id}-audience`} value={state.publicationAudience}
          required aria-invalid={state.publicationAudience === ""}
          onChange={(event) => updateField("publicationAudience", event.target.value as AdminReleaseFormState["publicationAudience"])}>
          <option value="" disabled>Select minimum audience</option>
          {publicationAudiences.map((audience) => <option key={audience} value={audience}>{audienceLabels[audience]}</option>)}
        </SelectInput>
      </FieldShell>
      <FieldShell label="Premade Playlist" htmlFor={`${id}-playlist`}>
        <SelectInput id={`${id}-playlist`} value={state.publicationPlaylist} onChange={event => updateField("publicationPlaylist", event.target.value as AdminReleaseFormState["publicationPlaylist"])}>
          <option value="">Automatic mix assignment</option>
          {songMixes.map(mix => <option key={mix.key} value={mix.key}>{mix.name}</option>)}
        </SelectInput>
      </FieldShell>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {([ ["publicationHomepage", "Homepage"], ["publicationNewReleases", "New Releases"] ] as const).map(([field, label]) => (
          <label key={field} className="flex min-h-11 items-center gap-2 text-sm text-white">
            <input type="checkbox" className="h-4 w-4" checked={state[field]}
              onChange={(event) => updateField(field, event.target.checked)} />
            {label}
          </label>
        ))}
      </div>
      <p role="status" className="text-sm text-white/65">
        {state.publicationAudience ? audienceLabels[state.publicationAudience] : "Audience not selected"}
        {" · Songs catalog"}
        {state.publicationHomepage ? " · Homepage" : ""}
        {state.publicationNewReleases ? " · New Releases" : ""}
      </p>
    </fieldset>
  );
}

export function AdminReleasePublicationTargets(props: AdminReleasePublicationTargetsProps) {
  const [open, setOpen] = useState(false);
  const fields = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    fields.current?.querySelector("select")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      if (event.key !== "Tab") return;
      const dialog = fields.current?.closest('[role="dialog"]');
      const controls = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex="0"]')) : [];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown, true);
    return () => { document.removeEventListener("keydown", keydown, true); previous?.focus(); };
  }, [open]);
  const { state } = props;
  return <section className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
    <div className="min-w-0"><h2 className="text-base font-semibold text-white">Where This Appears</h2>
      <p className="mt-1 text-sm text-white/65">{state.publicationAudience ? audienceLabels[state.publicationAudience] : "Select audience"}{state.publicationHomepage ? " · Homepage" : ""}{state.publicationNewReleases ? " · New Releases" : ""}{" · "}{songMixes.find(mix => mix.key === state.publicationPlaylist)?.name ?? "Automatic mix"}</p>
    </div>
    <Button type="button" variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog"><LayoutGrid className="h-4 w-4" aria-hidden /> Edit Placement</Button>
    {open ? <AdminRightShelf open title="Where This Appears" onClose={() => setOpen(false)}>
      <div ref={fields}><PublicationTargetFields {...props} /></div>
      <div className="sticky bottom-0 mt-6 bg-[#101222] py-4"><Button type="button" onClick={() => setOpen(false)}>Done</Button></div>
    </AdminRightShelf> : null}
  </section>;
}
