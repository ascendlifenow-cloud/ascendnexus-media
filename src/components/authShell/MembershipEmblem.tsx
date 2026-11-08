import premium from "../../assets/membership/ANMX-PREMIUM-MembershipEmblem.png";
import supporter from "../../assets/membership/ANMX-SUPPORTER-MembershipEmblem.png";
import vip from "../../assets/membership/ANMX-VIP-MembershipEmblem.png";
import { cx } from "../../utils/format";

const emblems: Record<string, string> = { premium, supporter, vip };

export function membershipEmblemSource(tier: string): string | undefined {
  const key = tier.trim().toLowerCase().replace(/[_-]/g, " ");
  const match = /^(premium|supporter|vip)(?: (?:member|membership|ready|monthly|annual))?$/.exec(key);
  return match ? emblems[match[1]] : undefined;
}

export function MembershipEmblem({ tier, className }: { tier: string; className?: string }) {
  const source = membershipEmblemSource(tier);
  if (!source) return null;
  return <img src={source} alt="" aria-hidden="true" width={768} height={768}
    className={cx("h-24 w-24 shrink-0 object-contain", className)} decoding="async" />;
}
