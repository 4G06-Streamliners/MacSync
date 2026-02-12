"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getDashboardStats,
  getEvents,
  type DashboardStats as StatsType,
  type EventItem,
} from "./_lib/api";

function formatRevenue(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        console.log("Loading dashboard data...");
        const [statsRes, eventsRes] = await Promise.all([
          getDashboardStats(),
          getEvents(),
        ]);
        console.log("Dashboard data loaded:", { stats: statsRes, eventsCount: eventsRes.length });
        setStats(statsRes);
        setEvents(eventsRes);
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
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your events and metrics</p>
      </div>

      {/* Stat cards */}
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

      {/* Event list card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Upcoming events</h2>
          <Link
            href="/events"
            className="text-sm font-semibold text-maroon hover:text-maroon-dark"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {upcomingEvents.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500">
              No upcoming events
            </div>
          ) : (
            upcomingEvents.map((event) => (
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
                  <p className="font-semibold text-gray-900 truncate">
                    {event.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(event.date)}
                    {event.location ? ` • ${event.location}` : ""}
                  </p>
                </div>
                <div className="text-sm font-semibold text-gray-700 flex-shrink-0">
                  {formatPrice(event.price)} / ticket
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
