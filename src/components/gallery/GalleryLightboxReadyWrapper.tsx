import type { ReactNode } from "react";

interface GalleryLightboxReadyWrapperProps {
  galleryItemId: string;
  title: string;
  children: ReactNode;
}

export function GalleryLightboxReadyWrapper({ galleryItemId, title, children }: GalleryLightboxReadyWrapperProps) {
  return (
    <div data-gallery-item-id={galleryItemId} data-gallery-title={title}>
      {children}
    </div>
  );
}
