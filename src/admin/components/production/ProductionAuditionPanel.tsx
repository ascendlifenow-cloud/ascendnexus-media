import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, Headphones, Loader2 } from "lucide-react";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { adminApiBase } from "../../services/AdminAuthApiService";

interface Props {
  releaseId: string;
  bundleHash: string;
  available: boolean;
  reviewed: boolean;
  onReviewed: () => void;
}

interface Audition {
  reference: string;
  expiresAt: number;
  revision: number;
  url: string;
}

async function readData(response: Response): Promise<Record<string, unknown>> {
  const payload = await response.json();
  if (!response.ok || payload?.success !== true || !payload.data || typeof payload.data !== "object") {
    throw new Error("Request failed");
  }
  return payload.data;
}

export function ProductionAuditionPanel(props: Props) {
  const { status, session } = useAdminAuth();
  if (!props.available) return <section className="border-t border-white/15 py-5">
    <h2 className="text-lg font-semibold text-white">Private audio audition</h2>
    <p role="status" className="mt-2 text-sm text-white/65">No audio candidate is available.</p>
  </section>;
  if (status !== "authenticated" || !session) return null;
  return <AuditionPanel key={JSON.stringify([props.releaseId, props.bundleHash, session.user.userId, session.sessionId])} {...props} />;
}

function AuditionPanel({ releaseId, bundleHash, reviewed, onReviewed }: Props) {
  const [audition, setAudition] = useState<Audition | null>(null);
  const [busy, setBusy] = useState<"load" | "review" | null>(null);
  const [played, setPlayed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const checkboxId = useId();
  const audio = useRef<HTMLAudioElement>(null);
  const current = useRef<Audition | null>(null);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const endpoint = `${adminApiBase()}/api/admin/releases/${encodeURIComponent(releaseId)}`;

  function dispose() {
    controller.current?.abort();
    controller.current = null;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    const element = audio.current;
    if (element) {
      element.pause();
      element.removeAttribute("src");
      element.load();
    }
    if (current.current) URL.revokeObjectURL(current.current.url);
    current.current = null;
  }

  function clear(message: string) {
    dispose();
    if (!mounted.current) return;
    setAudition(null);
    setPlayed(false);
    setConfirmed(false);
    setBusy(null);
    setError(message);
  }

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; dispose(); };
  }, []);

  useEffect(() => {
    if (!audition) return;
    let stopped = false;
    let pending: AbortController | undefined;
    const check = async () => {
      if (pending) return;
      pending = new AbortController();
      const request = pending;
      const timeout = setTimeout(() => request.abort(), 10_000);
      try {
        const response = await fetch(`${endpoint}/production-audition-check`, {
          method: "POST", credentials: "include", cache: "no-store", signal: pending.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: audition.reference, expectedBundleHash: bundleHash }),
        });
        const data = await readData(response);
        if (data.valid !== true) throw new Error("Invalid audition");
      } catch { if (!stopped) clear("Private audition access changed. Refresh the review."); }
      finally { clearTimeout(timeout); pending = undefined; }
    };
    const interval = setInterval(() => { void check(); }, 15_000);
    return () => { stopped = true; clearInterval(interval); pending?.abort(); };
  }, [audition, bundleHash, endpoint]);

  function isCurrent(request: AbortController) {
    return mounted.current && controller.current === request && !request.signal.aborted;
  }

  function expireAt(expiresAt: number) {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clear("Private audition expired. Load it again to continue.");
      return;
    }
    timer.current = setTimeout(() => expireAt(expiresAt), Math.min(remaining, 2_147_483_647));
  }

  function post(path: string, body: object, signal: AbortSignal) {
    return fetch(`${endpoint}/${path}`, {
      method: "POST", credentials: "include", cache: "no-store", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  }

  async function load() {
    if (controller.current || current.current) return;
    const request = new AbortController();
    controller.current = request;
    setBusy("load");
    setError("");
    try {
      const data = await readData(await post("production-audition", { expectedBundleHash: bundleHash }, request.signal));
      if (!isCurrent(request)) return;
      const expiresAt = typeof data.expiresAt === "string" ? Date.parse(data.expiresAt) : NaN;
      if (typeof data.reference !== "string" || !data.reference || !Number.isFinite(expiresAt)
        || expiresAt <= Date.now() || typeof data.revision !== "number"
        || !Number.isSafeInteger(data.revision) || data.revision < 0) throw new Error("Invalid audition");
      expireAt(expiresAt);
      const response = await fetch(`${endpoint}/production-audition?reference=${encodeURIComponent(data.reference)}`, {
        credentials: "include", cache: "no-store", signal: request.signal,
      });
      if (!isCurrent(request)) return;
      if (!response.ok || !/^audio\//i.test(response.headers.get("Content-Type") ?? "")) throw new Error("Invalid audio");
      // Full bytes are intentional for the bounded, server checksum-verified admin audition.
      const blob = await response.blob();
      if (!isCurrent(request)) return;
      if (expiresAt <= Date.now() || blob.size === 0 || blob.size > 128 * 1024 * 1024
        || !/^audio\//i.test(blob.type)) throw new Error("Invalid audio");
      const next = { reference: data.reference, expiresAt, revision: data.revision, url: URL.createObjectURL(blob) };
      current.current = next;
      setAudition(next);
      setBusy(null);
      controller.current = null;
    } catch {
      if (isCurrent(request)) clear("Private audition could not load. Please retry.");
    }
  }

  async function confirmReview() {
    const item = current.current;
    if (!item || !played || !confirmed || controller.current || reviewed || saved) return;
    if (item.expiresAt <= Date.now()) { clear("Private audition expired. Load it again to continue."); return; }
    const request = new AbortController();
    controller.current = request;
    setBusy("review");
    setError("");
    try {
      const data = await readData(await post("production-audio-review", {
        reference: item.reference, expectedBundleHash: bundleHash, confirmed: true,
      }, request.signal));
      if (!isCurrent(request)) return;
      if (item.expiresAt <= Date.now() || data.reviewed !== true || typeof data.reused !== "boolean") throw new Error("Invalid review");
      controller.current = null;
      setBusy(null);
      setSaved(true);
    } catch {
      if (isCurrent(request)) clear("Audio review could not be confirmed. Load the audition again to retry.");
      return;
    }
    onReviewed();
  }

  const buttonClass = "anm-focus inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 hover:border-anm-gold/45 disabled:cursor-not-allowed disabled:opacity-50";
  return <section className="min-w-0 border-t border-white/15 py-5" aria-label="Private audio audition" aria-busy={busy !== null}>
    <h2 className="text-lg font-semibold text-white">Private audio audition</h2>
    <p role="status" className="mt-2 text-sm text-white/65">{reviewed || saved ? "Audio review recorded." : "Audio review not recorded."}</p>
    {!audition ? <button type="button" className={`${buttonClass} mt-3`} disabled={busy !== null}
      title="Load private audition" aria-label="Load private audition" onClick={() => { void load(); }}>
      {busy === "load" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <Headphones className="h-4 w-4 shrink-0" aria-hidden="true" />}
      Load private audition
    </button> : <div className="mt-3 grid min-w-0 gap-3">
      <p className="text-xs text-white/55">Audio revision {audition.revision}</p>
      <audio ref={audio} src={audition.url} controls preload="none" autoPlay={false} className="w-full min-w-0"
        aria-label="Private production audio audition" onPlay={() => {
          if (current.current && current.current.expiresAt > Date.now()) setPlayed(true);
          else clear("Private audition expired. Load it again to continue.");
        }} onError={() => clear("Private audition could not play. Please retry.")} />
      <label htmlFor={checkboxId} className="flex items-start gap-2 text-sm text-white/75">
        <input id={checkboxId} type="checkbox" className="anm-focus mt-1 shrink-0" checked={confirmed}
          disabled={!played || busy !== null || reviewed || saved} onChange={(event) => setConfirmed(event.target.checked)} />
        I listened to this exact audio revision
      </label>
      <button type="button" className={`${buttonClass} justify-self-start`} title="Confirm audio reviewed" aria-label="Confirm audio reviewed"
        disabled={!played || !confirmed || busy !== null || reviewed || saved} onClick={() => { void confirmReview(); }}>
        {busy === "review" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
        Confirm audio reviewed
      </button>
    </div>}
    {busy === "load" ? <p role="status" className="mt-2 text-sm text-white/65">Loading private audio. This may take up to 60 seconds.</p> : null}
    {error ? <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p> : null}
  </section>;
}
