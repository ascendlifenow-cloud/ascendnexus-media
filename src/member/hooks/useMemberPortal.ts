import { useContext } from "react";
import { MemberPortalContext } from "../contexts/MemberPortalContext";

export const useMemberPortal = () => {
  const value = useContext(MemberPortalContext);
  if (!value) throw new Error("useMemberPortal must be used within the member portal.");
  return value;
};
