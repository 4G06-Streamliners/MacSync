import { Platform } from 'react-native';
import { getAuthToken } from './auth';

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
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          const message =
            parsed?.message ??
            parsed?.error ??
            (Array.isArray(parsed) ? parsed.join(', ') : null);
          detail = message ? `${detail} - ${message}` : `${detail} - ${text}`;
        } catch {
          detail = `${detail} - ${text}`;
        }
      }
    } catch {
      // ignore parsing errors
    }
    throw new Error(`API error: ${detail}`);
  }
  return res.json();
}

// ---------- Auth ----------
export interface VerifyCodeResponse {
  token: string;
  needsRegistration: boolean;
  user?: User | null;
}

export function checkEmail(email: string): Promise<{ isRegistered: boolean }> {
  return apiFetch('/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function loginWithPassword(
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function requestVerificationCode(email: string) {
  return apiFetch('/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function requestOtp(email: string) {
  return apiFetch('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
  return apiFetch('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function verifyOtp(email: string, code: string): Promise<VerifyCodeResponse> {
  return apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function registerProfile(data: {
  firstName: string;
  lastName: string;
  phone: string;
  program: string;
  password: string;
  confirmPassword?: string;
}): Promise<{ token: string; user: User }> {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getMe(): Promise<User> {
  return apiFetch('/auth/me');
}

// ---------- Users ----------
export interface User {
  id: number;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
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
  qrCodeData: string | null;
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
  selectedTable?: number,
): Promise<{ ticket?: any; error?: string }> {
  return apiFetch(`/events/${eventId}/signup`, {
    method: 'POST',
    body: JSON.stringify({ selectedTable }),
  });
}

export function createCheckoutSession(
  eventId: number,
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
): Promise<{ cancelled?: boolean; error?: string }> {
  return apiFetch(`/events/${eventId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
