"use client";

import { useState, useEffect } from "react";
import { getMyAdminEvents, sendBlast, type AdminEvent } from "../_lib/api";

export default function NotificationsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // cooldown: track last blast time per eventId
  const [lastBlast, setLastBlast] = useState<Record<number, number>>({});

  useEffect(() => {
    getMyAdminEvents()
      .then(setEvents)
      .catch(() => setError("Failed to load your events."))
      .finally(() => setLoading(false));
  }, []);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const cooldownRemaining = selectedEventId
    ? Math.max(
        0,
        3600 - Math.floor((Date.now() - (lastBlast[selectedEventId] ?? 0)) / 1000)
      )
    : 0;

  const handleSend = async () => {
    if (!selectedEventId) return;
    setSending(true);
    setResult(null);
    setError(null);
    setConfirming(false);
    try {
      const res = await sendBlast(selectedEventId, message || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        setResult(`Notification sent to ${res.sent} attendee${res.sent === 1 ? "" : "s"}.`);
        setLastBlast((prev) => ({ ...prev, [selectedEventId]: Date.now() }));
        setMessage("");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Notification</h1>
        <p className="text-gray-500 mt-1">
          Notify all attendees of one of your events.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading your events…</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
          You haven&apos;t created any events yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          {/* Event selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) =>
                setSelectedEventId(e.target.value ? +e.target.value : "")
              }
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-maroon"
            >
              <option value="">Select an event…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} —{" "}
                  {new Date(ev.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          </div>

          {/* Custom message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Message{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Add extra context for your attendees…"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-maroon"
            />
          </div>

          {/* Cooldown warning */}
          {cooldownRemaining > 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⏳ Cooldown active — you can blast this event again in{" "}
              {Math.ceil(cooldownRemaining / 60)} min.
            </p>
          )}

          {/* Confirm step */}
          {confirming ? (
            <div className="rounded-lg border border-maroon/30 bg-maroon/5 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">
                Send notification to all attendees of{" "}
                <span className="font-bold">{selectedEvent?.name}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 py-2 bg-maroon text-white rounded-lg text-sm font-semibold hover:bg-maroon-dark disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Confirm & Send"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={!selectedEventId || cooldownRemaining > 0}
              className="w-full py-2.5 bg-maroon text-white rounded-lg text-sm font-semibold hover:bg-maroon-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send Notification
            </button>
          )}

          {/* Feedback */}
          {result && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ✅ {result}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ❌ {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
