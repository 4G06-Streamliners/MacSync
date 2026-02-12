"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUsers, type User } from "../_lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = u.name?.toLowerCase() ?? "";
      const email = u.email?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q);
    });
  }, [users, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <p className="text-gray-500">Loading users…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">Could not load users</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">
            Search and view user profiles, tickets, and roles.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
            <span className="text-base mr-2">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users by name or email…"
              className="flex-1 text-sm text-gray-900 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-500">
              No users match your search.
            </div>
          ) : (
            filtered.map((u) => (
              <Link
                key={u.id}
                href={`/users/${u.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-gray-700">
                    {u.name?.charAt(0) ?? "?"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {u.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.isSystemAdmin && (
                    <span className="px-2 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold">
                      SYSTEM_ADMIN
                    </span>
                  )}
                  {u.roles?.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

