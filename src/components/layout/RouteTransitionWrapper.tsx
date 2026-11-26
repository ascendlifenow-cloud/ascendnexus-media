import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface RouteTransitionWrapperProps {
  children: ReactNode;
}

export function RouteTransitionWrapper({ children }: RouteTransitionWrapperProps) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-anm-route-enter">
      {children}
    </div>
  );
}
