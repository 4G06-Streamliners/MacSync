"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getEvent,
  getEventAttendees,
  updateEvent,
  deleteEvent,
  downloadVenueReportPdf,
  type EventItem,
  type EventAttendee,
  type CreateEventPayload,
} from "../../_lib/api";
import { EventAttendeesSection } from "../../components/events/EventAttendeesSection";

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function EventDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(true);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [venueReportLoading, setVenueReportLoading] = useState(false);
  const [venueReportError, setVenueReportError] = useState<string | null>(null);

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

  useEffect(() => {
    getEvent(+id)
      .then((ev) => {
        setEvent(ev);
        populateForm(ev);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load event"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setAttendeesLoading(true);
    setAttendeesError(null);
    getEventAttendees(+id)
      .then((list) => {
        if (!cancelled) setAttendees(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setAttendeesError(
            e instanceof Error ? e.message : "Failed to load attendees",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAttendeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function populateForm(ev: EventItem) {
    setForm({
      name: ev.name,
      description: ev.description ?? "",
      date: toLocalDatetime(ev.date),
      location: ev.location ?? "",
      capacity: String(ev.capacity),
      priceDollars: ev.price === 0 ? "" : (ev.price / 100).toFixed(2),
      imageUrl: ev.imageUrl ?? "",
      requiresTableSignup: ev.requiresTableSignup,
      requiresBusSignup: ev.requiresBusSignup,
      tableCount: ev.tableCount != null ? String(ev.tableCount) : "",
      seatsPerTable: ev.seatsPerTable != null ? String(ev.seatsPerTable) : "",
      busCount: ev.busCount != null ? String(ev.busCount) : "",
      busCapacity: ev.busCapacity != null ? String(ev.busCapacity) : "",
    });
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    if (event) populateForm(event);
    setFormError(null);
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.date) {
      setFormError("Date is required");
      return;
    }
    if (!form.location.trim()) {
      setFormError("Location is required");
      return;
    }
    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      setFormError("Capacity must be a positive number");
      return;
    }
    const priceDollars = form.priceDollars.trim()
      ? Number(form.priceDollars)
      : 0;
    if (!Number.isFinite(priceDollars) || priceDollars < 0) {
      setFormError("Price must be a non-negative number");
      return;
    }

    const payload: Partial<CreateEventPayload> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      date: new Date(form.date).toISOString(),
      location: form.location.trim(),
      capacity,
      price: Math.round(priceDollars * 100),
      imageUrl: form.imageUrl.trim() || undefined,
      requiresTableSignup: form.requiresTableSignup,
      requiresBusSignup: form.requiresBusSignup,
      tableCount: form.tableCount ? parseInt(form.tableCount) : undefined,
      seatsPerTable: form.seatsPerTable
        ? parseInt(form.seatsPerTable)
        : undefined,
      busCount: form.busCount ? parseInt(form.busCount) : undefined,
      busCapacity: form.busCapacity ? parseInt(form.busCapacity) : undefined,
    };

    try {
      setSubmitting(true);
      const updated = await updateEvent(+id, payload);
      setEvent(updated);
      populateForm(updated);
      setEditing(false);
      const list = await getEventAttendees(+id);
      setAttendees(list);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to update event",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadVenueReport() {
    setVenueReportError(null);
    try {
      setVenueReportLoading(true);
      await downloadVenueReportPdf(+id);
    } catch (err) {
      setVenueReportError(
        err instanceof Error ? err.message : "Failed to generate venue report",
      );
    } finally {
      setVenueReportLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    try {
      setDeleting(true);
      await deleteEvent(+id);
      setShowDeleteConfirm(false);
      router.push("/events");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete event";
      let display = msg.trim();
      if (display.startsWith("{")) {
        try {
          const parsed = JSON.parse(display) as {
            message?: string | string[];
          };
          if (Array.isArray(parsed.message)) {
            display = parsed.message.join(". ");
          } else if (typeof parsed.message === "string") {
            display = parsed.message;
          }
        } catch {
          /* keep raw message */
        }
      }
      setDeleteError(display);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  const headerActionsDisabled =
    !!deleteError || showDeleteConfirm || deleting;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <p className="text-gray-500">Loading event…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl">
        <Link
          href="/events"
          className="text-sm font-medium text-maroon hover:text-maroon-dark"
        >
          ← Back to events
        </Link>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Could not load event</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/events"
        className="text-sm font-medium text-maroon hover:text-maroon-dark"
      >
        ← Back to events
      </Link>

      {deleteError && !editing && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex justify-between gap-3 items-start"
          role="alert"
        >
          <p className="text-sm text-red-800 flex-1">{deleteError}</p>
          <button
            type="button"
            className="text-sm font-semibold text-red-900 shrink-0 hover:underline"
            onClick={() => setDeleteError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {event.name}
          </h1>
          <p className="text-gray-500 mt-1">{formatDate(event.date)}</p>
        </div>
        {!editing && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 justify-end">
            <button
              type="button"
              onClick={handleDownloadVenueReport}
              disabled={headerActionsDisabled || venueReportLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {venueReportLoading ? "Generating PDF…" : "Download venue report"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={headerActionsDisabled}
              className="px-4 py-2 rounded-lg bg-maroon text-white text-sm font-semibold hover:bg-maroon-dark transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Edit event
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setShowDeleteConfirm(true);
              }}
              disabled={headerActionsDisabled}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* View mode */}
      {!editing && (
        <div className="mt-6 space-y-5">
          {venueReportError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {venueReportError}
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            <DetailRow label="Description" value={event.description || "—"} />
            <DetailRow label="Location" value={event.location || "—"} />
            <DetailRow
              label="Capacity"
              value={`${event.registeredCount} / ${event.capacity} registered`}
            />
            <DetailRow label="Price" value={formatPrice(event.price)} />
            {event.imageUrl && (
              <DetailRow label="Image URL" value={event.imageUrl} />
            )}
          </div>

          {(event.requiresTableSignup || event.requiresBusSignup) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              <div className="px-5 py-3.5">
                <p className="text-sm font-semibold text-gray-900">
                  Seating configuration
                </p>
              </div>
              {event.requiresTableSignup && (
                <DetailRow
                  label="Tables"
                  value={`${event.tableCount ?? 0} tables × ${event.seatsPerTable ?? 0} seats`}
                />
              )}
              {event.requiresBusSignup && (
                <DetailRow
                  label="Buses"
                  value={`${event.busCount ?? 0} buses × ${event.busCapacity ?? 0} seats`}
                />
              )}
            </div>
          )}

          <EventAttendeesSection
            event={event}
            attendees={attendees}
            loading={attendeesLoading}
            error={attendeesError}
          />
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <form onSubmit={handleSave} className="mt-6 space-y-4">
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </div>
          )}

          <Field label="Name" required>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date & time" required>
              <input
                type="datetime-local"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                required
              />
            </Field>
            <Field label="Capacity" required>
              <input
                type="number"
                min={1}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
                value={form.capacity}
                onChange={(e) => update("capacity", e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Location" required>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Price (USD)">
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
            </Field>
            <Field label="Image URL">
              <input
                type="url"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
                value={form.imageUrl}
                onChange={(e) => update("imageUrl", e.target.value)}
              />
            </Field>
          </div>

          {/* Table signup toggle */}
          <div className="rounded-lg border border-gray-200 p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                Requires table signup
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-maroon"
                checked={form.requiresTableSignup}
                onChange={(e) =>
                  update("requiresTableSignup", e.target.checked)
                }
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

          {/* Bus signup toggle */}
          <div className="rounded-lg border border-gray-200 p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                Requires bus signup
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-maroon"
                checked={form.requiresBusSignup}
                onChange={(e) =>
                  update("requiresBusSignup", e.target.checked)
                }
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
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-maroon text-white text-sm font-semibold hover:bg-maroon-dark disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              setShowDeleteConfirm(false);
              setDeleteError(null);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3
              id="delete-event-title"
              className="text-lg font-bold text-gray-900"
            >
              Delete event
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{event.name}</span>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 px-5 py-3.5">
      <span className="text-sm font-medium text-gray-500 w-28 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900 break-words">{value}</span>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
