import { useState } from "react";
import type { AdminAuditEvent } from "../../models/admin";

export const useSelectedAuditEvent = () => {
  const [selectedEvent, setSelectedEvent] = useState<AdminAuditEvent | null>(null);
  return {
    selectedEvent,
    selectEvent: setSelectedEvent,
    clearSelectedEvent: () => setSelectedEvent(null),
  };
};
