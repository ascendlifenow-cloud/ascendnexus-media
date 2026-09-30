import type { MediaAssetType } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatMediaAssetType } from "../../utils/adminMediaUtils";

interface AdminMediaTypeBadgeProps {
  assetType: MediaAssetType;
}

export function AdminMediaTypeBadge({ assetType }: AdminMediaTypeBadgeProps) {
  const variant = assetType === "cover_art" ? "sunrise" : assetType === "audio_preview" ? "purple" : "glass";
  return <Badge variant={variant}>{formatMediaAssetType(assetType)}</Badge>;
}
