import type { ReactNode } from "react";
import { cx } from "../../utils/format";

interface CoverArtLightboxReadyWrapperProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function CoverArtLightboxReadyWrapper({ children, title, className }: CoverArtLightboxReadyWrapperProps) {
  return (
    <div className={cx("group/cover relative", className)} data-cover-art-title={title}>
      {children}
    </div>
  );
}
