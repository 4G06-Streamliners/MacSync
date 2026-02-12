const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url && typeof url === "string" && url.trim()) {
    return url.replace(/\/$/, "");
  }
  return "http://localhost:3000";
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  // Dynamically import to avoid server-side issues with document access
  const { getToken } = await import("./auth");
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `API error: ${res.status} ${res.statusText}`);
    }
    
    return res.json();
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
