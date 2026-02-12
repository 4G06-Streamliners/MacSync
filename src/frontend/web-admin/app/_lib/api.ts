const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (url && typeof url === "string" && url.trim()) return url.replace(/\/$/, "");
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---------- Dashboard stats ----------
export interface DashboardStats {
  userCount: number;
  eventCount: number;
  upcomingEventCount: number;
  ticketsSold: number;
  totalCapacity: number;
  totalRevenue: number;
  conversionRate: number;
}

export function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch("/admin/stats");
}

// ---------- Users ----------
export interface User {
  id: number;
  email: string;
  name: string;
  phoneNumber: string;
  program: string | null;
  isSystemAdmin: boolean;
  roles?: string[];
  createdAt: string;
  updatedAt: string;
}

export function getUsers(): Promise<User[]> {
  return apiFetch("/users");
}

export function getUser(id: number): Promise<User> {
  return apiFetch(`/users/${id}`);
}

// ---------- Events ----------
export interface EventItem {
  id: number;
  name: string;
  description: string | null;
  date: string;
  location: string | null;
  capacity: number;
  imageUrl: string | null;
  price: number;
  stripePriceId: string | null;
  requiresTableSignup: boolean;
  requiresBusSignup: boolean;
  tableCount: number | null;
  seatsPerTable: number | null;
  busCount: number | null;
  busCapacity: number | null;
  registeredCount: number;
  createdAt: string;
  updatedAt: string;
}

export function getEvents(): Promise<EventItem[]> {
  return apiFetch("/events");
}
