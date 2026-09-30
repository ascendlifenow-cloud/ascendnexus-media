import { useState } from "react";
import type { AdminMetadataRecord } from "../../models/admin";

export function useSelectedMetadataRecord() {
  const [selectedRecord, setSelectedRecord] = useState<AdminMetadataRecord | null>(null);

  return {
    selectedRecord,
    selectRecord: setSelectedRecord,
    clearSelectedRecord: () => setSelectedRecord(null),
  };
}
