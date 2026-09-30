import type { MediaAssetRecord } from "../../../models/admin";
import { useQueryClient } from "@tanstack/react-query";
import { AdminBatchUploadPanel } from "../../upload";
import { adminMediaKeys } from "../../../utils/admin";
import { AdminRightShelf } from "../AdminRightShelf";

interface AdminMediaUploadManagerProps {
  onAssetUploaded: (asset: MediaAssetRecord) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminMediaUploadManager({ onAssetUploaded, open, onOpenChange }: AdminMediaUploadManagerProps) {
  const queryClient = useQueryClient();

  const handleAssetUploaded = (asset: MediaAssetRecord) => {
    void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
    onAssetUploaded(asset);
    onOpenChange(false);
  };

  return (
    <AdminRightShelf
      open={open}
      title="Media Library Uploads"
      description="Upload unassigned media assets into the library. The shelf closes after a new asset is created."
      onClose={() => onOpenChange(false)}
      widthClassName="max-w-3xl"
    >
      <AdminBatchUploadPanel onAssetUploaded={handleAssetUploaded} onAssetView={onAssetUploaded} />
    </AdminRightShelf>
  );
}
