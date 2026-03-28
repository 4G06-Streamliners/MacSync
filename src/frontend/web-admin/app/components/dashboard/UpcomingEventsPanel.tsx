import Link from "next/link";
import Image from "next/image";
import type { EventItem } from "../../_lib/api";
import {
  formatDashboardDate,
  formatTicketPrice,
  getEventAvailabilityBadge,
} from "../../_lib/dashboard-format";

const BADGE_STYLES = {
  upcoming: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  few_left: "bg-amber-50 text-amber-900 ring-amber-100",
  sold_out: "bg-gray-100 text-gray-600 ring-gray-200",
} as const;

const BADGE_LABEL: Record<
  keyof typeof BADGE_STYLES,
  string
> = {
  upcoming: "Upcoming",
  few_left: "Few left",
  sold_out: "Sold out",
};

export function UpcomingEventsPanel({
  events,
}: {
  events: EventItem[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col min-h-0">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Upcoming events</h2>
        <Link
          href="/events"
          className="text-sm font-semibold text-maroon hover:text-maroon-dark"
        >
          View all
        </Link>
      </div>
      <div className="divide-y divide-gray-100 flex-1 min-h-0 overflow-auto">
        {events.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500">
            No upcoming events
          </div>
        ) : (
          events.map((event) => {
            const badge = getEventAvailabilityBadge(event);
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                  {event.imageUrl ? (
                    <Image
                      src={event.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-2xl">🖼️</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">
                      {event.name}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${BADGE_STYLES[badge]}`}
                    >
                      {BADGE_LABEL[badge]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatDashboardDate(event.date)}
                    {event.location ? ` • ${event.location}` : ""}
                  </p>
                </div>
                <div className="text-sm font-semibold text-gray-700 flex-shrink-0">
                  {formatTicketPrice(event.price)} / ticket
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
