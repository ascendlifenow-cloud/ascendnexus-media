import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { cx } from "../../utils/format";

interface AdminRightShelfProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  widthClassName?: string;
}

export function AdminRightShelf({
  open,
  title,
  description,
  children,
  onClose,
  widthClassName = "max-w-2xl",
}: AdminRightShelfProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cx(
        "fixed inset-0 z-[80] transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close shelf"
        onClick={onClose}
        className={cx(
          "absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "absolute right-0 top-0 flex h-full w-full flex-col border-l border-white/14 bg-[#101222] shadow-[-28px_0_80px_rgba(0,0,0,0.55)] transition-transform duration-300",
          widthClassName,
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/[0.045] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-white/58">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/12 text-white/72 transition hover:border-anm-gold/45 hover:text-white focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
            aria-label="Close shelf"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
