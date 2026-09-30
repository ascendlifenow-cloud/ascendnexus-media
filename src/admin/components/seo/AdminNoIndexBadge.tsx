import { Eye, EyeOff } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";

interface AdminNoIndexBadgeProps {
  noIndex: boolean;
}

export function AdminNoIndexBadge({ noIndex }: AdminNoIndexBadgeProps) {
  return (
    <Badge variant={noIndex ? "neutral" : "glass"} className={noIndex ? "text-white/48" : ""}>
      {noIndex ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
      {noIndex ? "No-Index" : "Indexable"}
    </Badge>
  );
}
