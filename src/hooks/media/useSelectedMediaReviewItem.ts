import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { MediaAssignmentReviewItem } from "../../models/media";

export function useSelectedMediaReviewItem() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedItemId = searchParams.get("review");

  const selectItem = useCallback((item: MediaAssignmentReviewItem) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("review", item.reviewItemId);
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const closeItem = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("review");
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  return useMemo(() => ({ selectedItemId, selectItem, closeItem }), [closeItem, selectItem, selectedItemId]);
}
