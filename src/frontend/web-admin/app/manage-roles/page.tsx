"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createRole,
  deleteRole,
  getMe,
  getRoles,
  type RoleRow,
  type User,
} from "../_lib/api";

export default function ManageRolesPage() {
  const [me, setMe] = useState<User | null>(null);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const meRes = await getMe();
        setMe(meRes);
        if (meRes.isSystemAdmin) {
          const rolesRes = await getRoles();
          setRoles(rolesRes);
        } else {
          setRoles([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load roles.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreateRole(e: FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createRole(newRoleName.trim());
      setRoles((prev) => {
        const exists = prev.some((r) => r.name === created.name);
        return exists ? prev : [...prev, created];
      });
      setNewRoleName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create role.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteRole(role: RoleRow) {
    if (role.name === "Member") return;
    const confirmed = window.confirm(
      `Delete role "${role.name}"?\n\nUsers with this role will lose it, and events managed by this role will become unassigned.`,
    );
    if (!confirmed) return;
    setDeletingRoleId(role.id);
    setError(null);
    try {
      const result = await deleteRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      window.alert(
        `Deleted ${result.deletedRoleName}. Affected users: ${result.affectedUsers}. Affected events: ${result.affectedEvents}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete role.");
    } finally {
      setDeletingRoleId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl">
        <p className="text-gray-500 mt-2">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Could not load roles</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!me?.isSystemAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900">Manage roles</h1>
        <p className="text-gray-500 mt-1">Only super admins can create roles.</p>
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600 font-medium">Forbidden</p>
          <p className="text-sm text-gray-500 mt-1">
            You must be a super admin to manage roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage roles</h1>
        <p className="text-gray-500 mt-1">
          Super admins can create team roles and manage role-based event
          permissions.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Existing roles</h2>
        </div>
        <div className="p-5">
          {roles.length === 0 ? (
            <p className="text-gray-500">No roles found.</p>
          ) : (
            <div className="space-y-2">
              {roles
                .slice()
                .sort((a, b) => {
                  if (a.name === "Member" && b.name !== "Member") return -1;
                  if (b.name === "Member" && a.name !== "Member") return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-gray-700">
                      {r.name}
                    </span>
                    {r.name !== "Member" ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(r)}
                        disabled={deletingRoleId === r.id}
                        className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        title={`Delete role ${r.name}`}
                      >
                        {deletingRoleId === r.id ? "Deleting..." : "Delete role"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">Protected</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleCreateRole} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Create a new role</h2>
          <p className="text-sm text-gray-500 mt-1">
            Example: <span className="font-mono">MES_ADMIN</span>
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Role name
          </label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-maroon"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="MES_ADMIN"
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setNewRoleName("")}
            disabled={creating}
          >
            Clear
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-maroon text-white text-sm font-semibold hover:bg-maroon-dark disabled:opacity-60"
            disabled={creating}
          >
            {creating ? "Creating…" : "Create role"}
          </button>
        </div>
      </form>
    </div>
  );
}
