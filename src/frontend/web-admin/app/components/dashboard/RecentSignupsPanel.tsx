import Link from "next/link";
import type { RecentSignup } from "../../_lib/api";
import { RecentSignupRow } from "./RecentSignupRow";

export function RecentSignupsPanel({ signups }: { signups: RecentSignup[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col min-h-0">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Recent signups</h2>
        <Link
          href="/signups"
          className="text-sm font-semibold text-maroon hover:text-maroon-dark"
        >
          View all
        </Link>
      </div>
      <div className="divide-y divide-gray-100 flex-1 min-h-0 overflow-auto">
        {signups.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500">
            No signups yet
          </div>
        ) : (
          signups.map((signup) => (
            <RecentSignupRow
              key={signup.ticketId}
              signup={signup}
              className="hover:bg-gray-50 transition-colors"
            />
          ))
        )}
      </div>
    </div>
  );
}
