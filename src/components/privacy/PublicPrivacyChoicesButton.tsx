import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { PublicConsentPreferenceCenter } from "./PublicConsentPreferenceCenter";

export function PublicPrivacyChoicesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[60] inline-flex min-h-10 items-center gap-2 rounded-md border border-white/14 bg-black/72 px-3 text-xs font-semibold text-white shadow-lg backdrop-blur transition hover:border-cyanGlow focus:outline-none focus:ring-2 focus:ring-cyanGlow"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Privacy Choices
      </button>
      <PublicConsentPreferenceCenter open={open} onClose={() => setOpen(false)} />
    </>
  );
}
