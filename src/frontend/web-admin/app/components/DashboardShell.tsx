"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/events", label: "Events" },
  { href: "/users", label: "Users" },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-app-gray">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-maroon rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">M</span>
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 leading-tight">
                MacSync
              </p>
              <p className="text-[11px] text-gray-500 leading-tight">
                Admin
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-maroon text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 px-3">Admin portal</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-4">
            <Link
              href="/events/create"
              className="px-4 py-2 bg-maroon hover:bg-maroon-dark text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Create event
            </Link>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-600">A</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
