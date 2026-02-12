"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getUser,
  getUserTickets,
  getMe,
  updateUser,
  type Ticket,
  type User,
} from "../../_lib/api";

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

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roleConfirmStep, setRoleConfirmStep] = useState<
    null | "confirm" | "password"
  >(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<boolean | null>(
    null,
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(userId)) return;
    async function load() {
      try {
        setError(null);
        const [me, u, t] = await Promise.all([
          getMe(),
          getUser(userId),
          getUserTickets(userId),
        ]);
        setCurrentUser(me);
        setUser(u);
        setTickets(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const attendedCount = useMemo(
    () => tickets.filter((t) => t.checkedIn).length,
    [tickets],
  );

  const currentRoles = currentUser?.roles ?? [];
  const currentIsAdmin =
    !!currentUser &&
    (currentUser.isSystemAdmin || currentRoles.includes("Admin"));

  function startRoleChange(next: boolean) {
    setPendingRoleChange(next);
    setRoleConfirmStep("confirm");
    setPasswordInput("");
    setPasswordError(null);
  }

  function cancelRoleChange() {
    setRoleConfirmStep(null);
    setPendingRoleChange(null);
    setPasswordInput("");
    setPasswordError(null);
  }

  async function submitRoleChange() {
    if (!user || pendingRoleChange === null) return;
    if (!passwordInput.trim()) {
      setPasswordError("Please enter your password.");
      return;
    }
    try {
      setSavingRole(true);
      setPasswordError(null);
      const updated = await updateUser(user.id, {
        isSystemAdmin: pendingRoleChange,
        password: passwordInput,
      });
      setUser((prev) => (prev ? { ...prev, ...updated } : updated));
      cancelRoleChange();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Unknown error";
      let friendly = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.message === "Invalid password." || parsed?.statusCode === 401) {
          friendly = "Password is incorrect. Please try again.";
        } else if (typeof parsed?.message === "string") {
          friendly = parsed.message;
        }
      } catch {
        // Not JSON; use raw message unless it looks like a raw API response
        if (raw.startsWith("{") && raw.includes("statusCode")) {
          friendly = "Password is incorrect. Please try again.";
        }
      }
      setPasswordError(friendly);
    } finally {
      setSavingRole(false);
    }
  }

  function onConfirmYes() {
    setRoleConfirmStep("password");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <p className="text-gray-500">Loading user…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">Could not load user</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-gray-700">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role change confirmation modal */}
      {roleConfirmStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && cancelRoleChange()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-confirm-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {roleConfirmStep === "confirm" ? (
              <>
                <h2
                  id="role-confirm-title"
                  className="text-lg font-bold text-gray-900"
                >
                  Confirm admin role change
                </h2>
                <p className="mt-2 text-gray-600">
                  Are you sure you want to do that?
                </p>
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={cancelRoleChange}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmYes}
                    className="px-4 py-2 text-sm font-medium text-white bg-maroon hover:bg-maroon-dark rounded-lg transition-colors"
                  >
                    Yes, continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2
                  id="role-confirm-title"
                  className="text-lg font-bold text-gray-900"
                >
                  Enter your password
                </h2>
                <p className="mt-2 text-gray-600">
                  Enter your password to confirm this change.
                </p>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Your password"
                  className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon focus:border-maroon outline-none"
                  autoFocus
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRoleChange();
                    if (e.key === "Escape") cancelRoleChange();
                  }}
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                )}
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={cancelRoleChange}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitRoleChange}
                    disabled={savingRole}
                    className="px-4 py-2 text-sm font-medium text-white bg-maroon hover:bg-maroon-dark rounded-lg transition-colors disabled:opacity-60"
                  >
                    {savingRole ? "Verifying…" : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-6">
        <div>
          <Link
            href="/users"
            className="text-sm font-medium text-maroon hover:text-maroon-dark"
          >
            ← Back to users
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {user.name}
          </h1>
          <p className="text-gray-500 mt-1">{user.email}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 mr-1">Role:</span>
            {(user.roles && user.roles.length > 0
              ? user.roles
              : ["Member"]
            ).map((r) => (
              <span
                key={r}
                className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
              >
                {r}
              </span>
            ))}
            {user.isSystemAdmin && (
              <span className="px-2 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold">
                SYSTEM_ADMIN
              </span>
            )}
          </div>
          {currentIsAdmin && (
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm font-medium text-maroon hover:text-maroon-dark hover:underline"
            >
              {showAdvanced ? "Hide advanced settings" : "Advanced settings"}
            </button>
          )}
        </div>
      </div>

      {showAdvanced && currentIsAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Advanced settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Dangerous actions and system-level changes.
            </p>
          </div>

          {/* System admin toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">System admin</p>
              <p className="text-xs text-gray-500">
                Controls admin-only access (login gating comes later).
              </p>
            </div>
            <button
              type="button"
              onClick={() => startRoleChange(!user.isSystemAdmin)}
              disabled={savingRole}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                user.isSystemAdmin ? "bg-maroon" : "bg-gray-300"
              } ${savingRole ? "opacity-60" : ""}`}
              aria-pressed={user.isSystemAdmin}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  user.isSystemAdmin ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <hr className="border-gray-200" />

          {/* Delete user */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete user</p>
              <p className="text-xs text-gray-500">
                Permanently remove this user and all associated data. This action
                cannot be undone.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-red-600 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete user
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">Tickets purchased</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {tickets.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">Events attended</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {attendedCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">Program</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {user.program ?? "—"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Tickets</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {tickets.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500">
              No tickets for this user yet.
            </div>
          ) : (
            tickets.map((t) => (
              <div key={t.ticketId} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {t.eventName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(t.eventDate)}
                      {t.eventLocation ? ` • ${t.eventLocation}` : ""}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Price: {formatPrice(t.eventPrice)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {t.checkedIn ? (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                        ATTENDED
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        NOT_CHECKED_IN
                      </span>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Purchased {formatDate(t.createdAt)}
                    </p>
                  </div>
                </div>

                {(t.tableSeat || t.busSeat) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.tableSeat && (
                      <span className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700">
                        Table: {t.tableSeat}
                      </span>
                    )}
                    {t.busSeat && (
                      <span className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700">
                        Bus: {t.busSeat}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

