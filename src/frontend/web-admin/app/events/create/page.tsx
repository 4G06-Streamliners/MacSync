"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEvent,
  getMe,
  type CreateEventPayload,
  type User,
} from "../../_lib/api";
import { datetimeLocalValueToIsoUtc } from "../../_lib/datetime";

export default function CreateEventPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    capacity: "",
    priceDollars: "",
    imageUrl: "",
    requiresTableSignup: false,
    requiresBusSignup: false,
    tableCount: "",
    seatsPerTable: "",
    busCount: "",
    busCapacity: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roles = me?.roles ?? [];
  const canCreate =
    !!me &&
    (me.isSystemAdmin ||
      roles.includes("Admin") ||
      roles.some((r) => r !== "Member" && r !== "Admin"));

  useEffect(() => {
    getMe()
      .then((user) => {
        setMe(user);
      })
      .catch(() => {
        setMe(null);
      })
      .finally(() => setLoadingMe(false));
  }, []);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canCreate) {
      setError("You do not have permission to create events.");
      return;
    }

    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.date) {
      setError("Date is required");
      return;
    }
    if (!form.location.trim()) {
      setError("Location is required");
      return;
    }

    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      setError("Capacity must be a positive number");
      return;
    }

    const priceDollars = form.priceDollars.trim()
      ? Number(form.priceDollars)
      : 0;
    if (!Number.isFinite(priceDollars) || priceDollars < 0) {
      setError("Price must be a non‑negative number");
      return;
    }

    const payload: CreateEventPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      date: datetimeLocalValueToIsoUtc(form.date),
      location: form.location.trim() || undefined,
      capacity,
      imageUrl: form.imageUrl.trim() || undefined,
      price: Math.round(priceDollars * 100),
      requiresTableSignup: form.requiresTableSignup,
      requiresBusSignup: form.requiresBusSignup,
      tableCount: form.tableCount ? parseInt(form.tableCount, 10) : undefined,
      seatsPerTable: form.seatsPerTable
        ? parseInt(form.seatsPerTable, 10)
        : undefined,
      busCount: form.busCount ? parseInt(form.busCount, 10) : undefined,
      busCapacity: form.busCapacity ? parseInt(form.busCapacity, 10) : undefined,
    };

    try {
      setSubmitting(true);
      await createEvent(payload);
      router.push("/events");
      router.refresh();
    } catch (err) {
      console.error("Create event error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create event",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Create event</h1>
      <p className="text-gray-500 mt-1">
        Add a new event. It will show up in the mobile app and dashboard.
      </p>
      {loadingMe ? (
        <p className="text-sm text-gray-500 mt-2">Checking permissions…</p>
      ) : !canCreate ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          You do not have permission to create events.
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date &amp; time
            </label>
            <input
              type="datetime-local"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Capacity
            </label>
            <input
              type="number"
              min={1}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
              value={form.capacity}
              onChange={(e) => update("capacity", e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Location<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Price (USD)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
            value={form.priceDollars}
            onChange={(e) => update("priceDollars", e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty or 0 for a free event.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Image URL
          </label>
          <input
            type="url"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
            value={form.imageUrl}
            onChange={(e) => update("imageUrl", e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              Requires table signup
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-maroon"
              checked={form.requiresTableSignup}
              onChange={(e) => update("requiresTableSignup", e.target.checked)}
            />
          </label>
          {form.requiresTableSignup && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-500"># of Tables</label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
                  value={form.tableCount}
                  onChange={(e) => update("tableCount", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Seats / Table</label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
                  value={form.seatsPerTable}
                  onChange={(e) => update("seatsPerTable", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              Requires bus signup
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-maroon"
              checked={form.requiresBusSignup}
              onChange={(e) => update("requiresBusSignup", e.target.checked)}
            />
          </label>
          {form.requiresBusSignup && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-500"># of Buses</label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
                  value={form.busCount}
                  onChange={(e) => update("busCount", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Seats / Bus</label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
                  value={form.busCapacity}
                  onChange={(e) => update("busCapacity", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => router.back()}
            disabled={submitting || !canCreate}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-maroon text-white text-sm font-semibold hover:bg-maroon-dark disabled:opacity-60"
            disabled={submitting || !canCreate}
          >
            {submitting ? "Creating…" : "Create event"}
          </button>
        </div>
      </form>
    </div>
  );
}

