import Link from "next/link";
import type { EventAttendee, EventItem } from "../../_lib/api";

function formatRegisteredAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EventAttendeesSection({
  event,
  attendees,
  loading,
  error,
}: {
  event: EventItem;
  attendees: EventAttendee[];
  loading: boolean;
  error: string | null;
}) {
  const showTable = event.requiresTableSignup;
  const showBus = event.requiresBusSignup;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">
          Registered attendees
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Contact details, seat assignments, and check-in status
        </p>
      </div>

      {loading && (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          Loading attendees…
        </div>
      )}

      {!loading && error && (
        <div className="px-5 py-6 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && attendees.length === 0 && (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          No one has registered yet.
        </div>
      )}

      {!loading && !error && attendees.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 whitespace-nowrap">Attendee</th>
                <th className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                  Contact
                </th>
                {showTable && (
                  <th className="px-4 py-3 whitespace-nowrap">Table seat</th>
                )}
                {showBus && (
                  <th className="px-4 py-3 whitespace-nowrap">Bus seat</th>
                )}
                <th className="px-4 py-3 whitespace-nowrap">Check-in</th>
                <th className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                  Signed up
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendees.map((a) => (
                <tr key={a.ticketId} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/users/${a.userId}`}
                      className="font-semibold text-maroon hover:text-maroon-dark"
                    >
                      {a.name}
                    </Link>
                    {a.program && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {a.program}
                      </p>
                    )}
                    <div className="md:hidden mt-2 text-xs text-gray-600 space-y-0.5">
                      <p>{a.email}</p>
                      <p>{a.phoneNumber}</p>
                      <p className="text-gray-400">
                        {formatRegisteredAt(a.registeredAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top hidden md:table-cell">
                    <p className="text-gray-900">{a.email}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {a.phoneNumber}
                    </p>
                  </td>
                  {showTable && (
                    <td className="px-4 py-3 align-top text-gray-800">
                      {a.tableSeat || "—"}
                    </td>
                  )}
                  {showBus && (
                    <td className="px-4 py-3 align-top text-gray-800">
                      {a.busSeat || "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1 items-start">
                      {a.checkedIn ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                          Checked in
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                          Not checked in
                        </span>
                      )}
                      {a.pendingRefund && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
                          Refund pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top hidden lg:table-cell text-gray-600 whitespace-nowrap">
                    {formatRegisteredAt(a.registeredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
