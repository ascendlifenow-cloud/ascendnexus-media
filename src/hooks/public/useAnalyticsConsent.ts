import { useContext } from "react";
import { PublicConsentContext } from "../../providers/PublicConsentProvider";

export const useAnalyticsConsent = () => useContext(PublicConsentContext);
