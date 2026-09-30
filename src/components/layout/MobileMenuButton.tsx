import { Menu, X } from "lucide-react";

interface MobileMenuButtonProps {
  open: boolean;
  controlsId: string;
  onClick: () => void;
}

export function MobileMenuButton({ open, controlsId, onClick }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      className="grid h-11 w-11 place-items-center rounded-md border border-white/14 bg-white/[0.055] text-white transition hover:border-anm-blue/50 hover:bg-white/12 anm-focus md:hidden"
      onClick={onClick}
      aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={open}
      aria-controls={controlsId}
    >
      {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
