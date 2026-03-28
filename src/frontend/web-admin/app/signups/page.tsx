"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentSignups, type RecentSignup } from "../_lib/api";
import { RecentSignupRow } from "../components/dashboard/RecentSignupRow";

export default function SignupsPage() {
  const [signups, setSignups] = useState<RecentSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecentSignups(100)
      .then(setSignups)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load signups"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <p className="text-gray-500">Loading signups…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">Could not load signups</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm font-semibold text-maroon hover:text-maroon-dark"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Event signups
          </h1>
          <p className="text-gray-500 mt-1">
            All registrations, including free events (newest first)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {signups.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-500">
              No signups yet
            </div>
          ) : (
            signups.map((signup) => (
              <RecentSignupRow key={signup.ticketId} signup={signup} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
