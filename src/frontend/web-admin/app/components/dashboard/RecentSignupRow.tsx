import type { RecentSignup } from "../../_lib/api";
import {
  avatarPaletteClass,
  formatTicketPrice,
  getInitials,
} from "../../_lib/dashboard-format";

export function RecentSignupRow({
  signup,
  className = "",
}: {
  signup: RecentSignup;
  className?: string;
}) {
  const ticketsLabel =
    signup.ticketCount === 1 ? "1 ticket" : `${signup.ticketCount} tickets`;
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 ${className}`.trim()}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarPaletteClass(signup.userId)}`}
        aria-hidden
      >
        {getInitials(signup.buyerName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 truncate">
          {signup.buyerName}
        </p>
        <p className="text-sm text-gray-500 truncate">
          {signup.eventName} · {ticketsLabel}
        </p>
      </div>
      <div className="text-sm font-semibold text-gray-700 flex-shrink-0 tabular-nums">
        {formatTicketPrice(signup.totalCents)}
      </div>
    </div>
  );
}
