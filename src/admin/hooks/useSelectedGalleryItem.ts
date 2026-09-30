import { useState } from "react";
import type { PublicGalleryItem } from "../../models/gallery";

export function useSelectedGalleryItem() {
  const [selectedItem, setSelectedItem] = useState<PublicGalleryItem | null>(null);

  return {
    selectedItem,
    selectItem: setSelectedItem,
    clearSelectedItem: () => setSelectedItem(null),
  };
}
