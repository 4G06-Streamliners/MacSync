import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL in .env for physical device (e.g. http://192.168.1.100:3000)
// Otherwise: Android emulator -> 10.0.2.2:3000, iOS simulator -> localhost:3000
const getBaseUrl = (): string => {
  const env = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
  if (env && typeof env === 'string' && env.trim()) return env.replace(/\/$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
};

const API_BASE = getBaseUrl();

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
  return apiFetch('/users');
}

export function getUser(id: number): Promise<User> {
  return apiFetch(`/users/${id}`);
}

export function updateUser(id: number, data: Partial<User>): Promise<User> {
  return apiFetch(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
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
  price: number; // cents
  stripePriceId: string | null;
  requiresTableSignup: boolean;
  requiresBusSignup: boolean;
  tableCount: number | null;
  seatsPerTable: number | null;
  busCount: number | null;
  busCapacity: number | null;
  registeredCount: number;
  userTicket?: { tableSeat: string | null; busSeat: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export function getEvents(): Promise<EventItem[]> {
  return apiFetch('/events');
}

export function getEvent(
  id: number,
  userId?: number,
): Promise<EventItem> {
  const url =
    userId != null ? `/events/${id}?userId=${encodeURIComponent(userId)}` : `/events/${id}`;
  return apiFetch(url);
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
  return apiFetch('/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteEvent(id: number): Promise<{ deleted: boolean }> {
  return apiFetch(`/events/${id}`, { method: 'DELETE' });
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

export function signupForEvent(
  eventId: number,
  userId: number,
  selectedTable?: number,
): Promise<{ ticket?: any; error?: string }> {
  return apiFetch(`/events/${eventId}/signup`, {
    method: 'POST',
    body: JSON.stringify({ userId, selectedTable }),
  });
}

export function createCheckoutSession(
  eventId: number,
  userId: number,
  options: {
    successUrl?: string;
    cancelUrl?: string;
    selectedTable?: number;
  },
): Promise<{ url?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  return apiFetch<{ url?: string; error?: string }>(`/events/${eventId}/checkout-session`, {
    method: 'POST',
    signal: controller.signal,
    body: JSON.stringify({
      userId,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      selectedTable: options.selectedTable,
    }),
  }).finally(() => clearTimeout(timeoutId));
}

export function releaseCheckoutReservation(
  stripeSessionId: string,
): Promise<{ released?: boolean; error?: string }> {
  return apiFetch(`/events/checkout-session/${encodeURIComponent(stripeSessionId)}/release`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function cancelSignup(
  eventId: number,
  userId: number,
): Promise<{ cancelled?: boolean; error?: string }> {
  return apiFetch(`/events/${eventId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}
