import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

interface RouteTransitionWrapperProps {
  children: ReactNode;
}

export function RouteTransitionWrapper({ children }: RouteTransitionWrapperProps) {
  const location = useLocation();

  return (
    <div key={`${location.pathname}${location.search}`} className="animate-anm-route-enter">
      {children}
    </div>
  );
}
