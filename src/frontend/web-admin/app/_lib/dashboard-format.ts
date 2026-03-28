import type { EventItem } from "./api";

export function formatRevenue(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDashboardDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTicketPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return (w[0]! + (w[1] ?? w[0]!)).toUpperCase();
  }
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export type EventAvailabilityBadge = "upcoming" | "few_left" | "sold_out";

export function getEventAvailabilityBadge(
  event: Pick<EventItem, "capacity" | "registeredCount">,
): EventAvailabilityBadge {
  const { capacity, registeredCount } = event;
  if (capacity > 0 && registeredCount >= capacity) return "sold_out";
  if (capacity > 0 && registeredCount / capacity >= 0.8) return "few_left";
  return "upcoming";
}

const AVATAR_PALETTES = [
  "bg-emerald-100 text-emerald-900",
  "bg-sky-100 text-sky-900",
  "bg-pink-100 text-pink-900",
  "bg-amber-100 text-amber-900",
  "bg-violet-100 text-violet-900",
] as const;

export function avatarPaletteClass(userId: number): string {
  return AVATAR_PALETTES[Math.abs(userId) % AVATAR_PALETTES.length]!;
}
