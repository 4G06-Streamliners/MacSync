"use client";

import { useState, useEffect } from "react";
import {
  getDashboardStats,
  getEvents,
  getRecentSignups,
  type DashboardStats as StatsType,
  type EventItem,
  type RecentSignup,
} from "./_lib/api";
import { formatRevenue } from "./_lib/dashboard-format";
import { UpcomingEventsPanel } from "./components/dashboard/UpcomingEventsPanel";
import { RecentSignupsPanel } from "./components/dashboard/RecentSignupsPanel";

export default function DashboardHome() {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [statsRes, eventsRes, signupsRes] = await Promise.all([
          getDashboardStats(),
          getEvents(),
          getRecentSignups(8),
        ]);
        setStats(statsRes);
        setEvents(eventsRes);
        setRecentSignups(signupsRes);
      } catch (e) {
        console.error("Dashboard load error:", e);
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">Could not load dashboard</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-sm mt-2 text-red-600">
          Ensure the backend is running and NEXT_PUBLIC_API_URL points to it.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total users",
      value: stats?.userCount ?? 0,
    },
    {
      label: "Total events",
      value: stats?.eventCount ?? 0,
    },
    {
      label: "Upcoming events",
      value: stats?.upcomingEventCount ?? 0,
    },
    {
      label: "Tickets sold",
      value: stats?.ticketsSold ?? 0,
    },
    {
      label: "Total revenue",
      value: stats != null ? formatRevenue(stats.totalRevenue) : "—",
      highlight: true,
    },
    {
      label: "Conversion rate",
      value: stats != null ? `${stats.conversionRate}%` : "—",
    },
  ];

  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= new Date())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your events and metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p
              className={`mt-1 text-xl font-bold ${
                card.highlight ? "text-maroon" : "text-gray-900"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:min-h-[min(28rem,50vh)]">
        <UpcomingEventsPanel events={upcomingEvents} />
        <RecentSignupsPanel signups={recentSignups} />
      </div>
    </div>
  );
}
