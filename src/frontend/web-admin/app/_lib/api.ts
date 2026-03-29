import { getToken } from "./auth";

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url && typeof url === "string" && url.trim()) {
    return url.replace(/\/$/, "");
  }
  return "http://localhost:3000";
};

function extractApiMessage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as {
      message?: string | string[];
      error?: string;
      statusCode?: number;
    };
    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message.join(". ");
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function isAccessDeniedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("access denied") || msg.includes("forbidden");
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  const token = getToken();
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Only set JSON content-type when there is a body. Fastify rejects requests that
  // send Content-Type: application/json with an empty body (e.g. DELETE).
  const body = options?.body;
  const hasStringBody =
    typeof body === "string" && body.length > 0;
  if (
    hasStringBody &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    
    const text = await res.text();

    if (!res.ok) {
      const extracted = extractApiMessage(text);
      throw new Error(extracted || `API error: ${res.status} ${res.statusText}`);
    }

    if (!text.trim()) {
      return {} as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(text);
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(`Failed to connect to backend at ${url}. Is the backend running?`);
    }
    throw error;
  }
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

export interface RecentSignup {
  ticketId: number;
  userId: number;
  buyerName: string;
  eventId: number;
  eventName: string;
  ticketCount: number;
  totalCents: number;
  registeredAt: string;
}

export function getRecentSignups(limit = 10): Promise<RecentSignup[]> {
  const q = limit !== 10 ? `?limit=${encodeURIComponent(String(limit))}` : "";
  return apiFetch(`/admin/recent-signups${q}`);
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
  managedEventIds?: number[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Roles ----------
export interface RoleRow {
  id: number;
  name: string;
}

export function getRoles(): Promise<RoleRow[]> {
  return apiFetch("/roles");
}

export function createRole(name: string): Promise<RoleRow> {
  return apiFetch("/roles", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getUsers(): Promise<User[]> {
  return apiFetch("/users");
}

export function getUser(id: number): Promise<User> {
  return apiFetch(`/users/${id}`);
}

export function updateUser(
  id: number,
  data: Partial<User> & { password?: string },
): Promise<User> {
  return apiFetch(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function updateUserRoles(
  id: number,
  roles: string[],
): Promise<User> {
  return apiFetch(`/users/${id}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roles }),
  });
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
  createdBy: number | null;
  managingRoleId?: number | null;
  managingRoleName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getEvents(): Promise<EventItem[]> {
  return apiFetch("/events");
}

export interface CreateEventPayload {
  name: string;
  description?: string;
  date: string;
  location?: string;
  capacity: number;
  imageUrl?: string;
  price: number;
  stripePriceId?: string;
  requiresTableSignup?: boolean;
  requiresBusSignup?: boolean;
  tableCount?: number;
  seatsPerTable?: number;
  busCount?: number;
  busCapacity?: number;
}

export function createEvent(data: CreateEventPayload): Promise<EventItem> {
  return apiFetch("/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getEvent(id: number): Promise<EventItem> {
  return apiFetch(`/events/${id}`);
}

export interface EventAttendee {
  ticketId: number;
  userId: number;
  name: string;
  email: string;
  phoneNumber: string;
  program: string | null;
  checkedIn: boolean;
  tableSeat: string | null;
  busSeat: string | null;
  registeredAt: string;
  pendingRefund: boolean;
}

export function getEventAttendees(eventId: number): Promise<EventAttendee[]> {
  return apiFetch(`/events/${eventId}/attendees`);
}

export function updateEvent(
  id: number,
  data: Partial<CreateEventPayload>,
): Promise<EventItem> {
  return apiFetch(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteEvent(id: number): Promise<{ deleted: boolean }> {
  return apiFetch(`/events/${id}`, { method: "DELETE" });
}

export function setEventManagingRole(
  eventId: number,
  roleName: string | null,
): Promise<{ ok: boolean }> {
  return apiFetch(`/events/${eventId}/managing-role`, {
    method: "PATCH",
    body: JSON.stringify({ roleName }),
  });
}

/** Admin: venue order PDF (reportlab via backend). */
export async function downloadVenueReportPdf(eventId: number): Promise<void> {
  const base = getBaseUrl();
  const url = `${base}/events/${eventId}/venue-report`;
  const token = getToken();
  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to download venue report (${res.status})`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `macsync-venue-order-${eventId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

// ---------- Tickets ----------
export interface Ticket {
  ticketId: number;
  eventId: number;
  checkedIn: boolean;
  busSeat: string | null;
  tableSeat: string | null;
  createdAt: string;
  eventName: string;
  eventDate: string;
  eventLocation: string | null;
  eventPrice: number;
  eventImageUrl: string | null;
}

export function getUserTickets(userId: number): Promise<Ticket[]> {
  return apiFetch(`/events/user/${userId}/tickets`);
}

// ---------- Auth ----------
export interface LoginResponse {
  token: string;
  user: User;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getMe(): Promise<User> {
  return apiFetch("/auth/me");
}

// ---------- Notifications ----------
export interface AdminEvent {
  id: number;
  name: string;
  date: string;
}

export function getMyAdminEvents(): Promise<AdminEvent[]> {
  return apiFetch("/notifications/my-events");
}

export function sendBlast(
  eventId: number,
  message?: string,
): Promise<{ sent?: number; error?: string }> {
  return apiFetch("/notifications/blast", {
    method: "POST",
    body: JSON.stringify({ eventId, message }),
  });
}
