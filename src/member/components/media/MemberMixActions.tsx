import { useRef, useState } from "react";
import { ListMinus, ListPlus, Play } from "lucide-react";
import { usePublicAudioPlayer } from "../../../hooks/public";
import { ActionTooltip } from "../../../components/ui/ActionTooltip";
import type { MemberDashboardContentCard } from "../../services/memberPortalTypes";
import { songActionRelease } from "./MemberSongSelection";

export function MemberMixActions({ name, items }: { name: string; items: MemberDashboardContentCard[] }) {
  const player = usePublicAudioPlayer();
  const starting = useRef(false);
  const [message, setMessage] = useState("");
  const unique = [...new Map(items.filter(item => item.contentType === "release" && item.streamAvailable === true).map(item => [item.contentId, item])).values()];
  const add = () => {
    for (const item of unique) player.enqueue({ releaseId: item.contentId, url: item.audioPreviewUrl ?? "" }, songActionRelease(item));
    setMessage(`${unique.length} songs queued.`);
  };
  const play = () => {
    if (!unique.length || starting.current) return;
    starting.current = true;
    player.clearQueue();
    add();
    const first = unique[0];
    void player.playQueued({ releaseId: first.contentId, url: first.audioPreviewUrl ?? "" }, songActionRelease(first))
      .catch(() => setMessage("Playback could not start. Please try again."))
      .finally(() => { starting.current = false; });
  };
  const remove = () => {
    for (const id of new Set(items.map(item => item.contentId))) player.removeFromQueue(id);
    setMessage("Mix removed from the queue.");
  };
  const hasQueued = player.queue.some(entry => items.some(item => item.contentId === entry.release.releaseId));
  return <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label={`${name} playback actions`}>
    {[
      { label: `Play ${name}`, tooltip: "Play mix (replaces queue)", icon: Play, action: play, disabled: !unique.length || player.status === "loading" || player.status === "buffering" },
      { label: `Add ${name} to queue`, tooltip: "Add mix to queue", icon: ListPlus, action: add, disabled: !unique.length },
      { label: `Remove ${name} from queue`, tooltip: "Remove mix from queue", icon: ListMinus, action: remove, disabled: !hasQueued },
    ].map(({ label, tooltip, icon: Icon, action, disabled }) => <button key={label} type="button" aria-label={label} disabled={disabled} onClick={action}
      className="group/action relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
      <Icon className="h-4 w-4" aria-hidden /><ActionTooltip label={tooltip} />
    </button>)}
    {message ? <span role="status" className="text-xs text-white/70">{message}</span> : null}
    {!unique.length ? <span className="text-xs text-white/60">No full plays currently available in this mix.</span> : null}
  </div>;
}
