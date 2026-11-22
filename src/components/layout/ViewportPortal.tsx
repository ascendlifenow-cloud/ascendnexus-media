import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// Animated route ancestors establish containing blocks for fixed-position controls.
export function ViewportPortal({ children }: { children: ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}
