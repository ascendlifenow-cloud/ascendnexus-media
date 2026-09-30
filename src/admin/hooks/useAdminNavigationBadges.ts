import { useEffect, useState } from "react";
import { mediaAssignmentReviewService } from "../../services/media/MediaAssignmentReviewService";

export interface AdminNavigationBadges {
  media_review?: number;
}

export function useAdminNavigationBadges() {
  const [badges, setBadges] = useState<AdminNavigationBadges>({});

  useEffect(() => {
    let active = true;
    void mediaAssignmentReviewService.listReviewItems().then((result) => {
      if (!active || !result.ok) return;
      const count = result.data.filter((item) => item.status === "pending" || item.status === "in_review").length;
      setBadges({ media_review: count });
    });
    return () => {
      active = false;
    };
  }, []);

  return badges;
}
