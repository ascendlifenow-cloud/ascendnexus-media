export interface PublicNavLink {
  label: string;
  href: string;
  enabled?: boolean;
  matchPaths?: string[];
}

export interface HeaderCTAConfig {
  label: string;
  href: string;
  enabled?: boolean;
}
