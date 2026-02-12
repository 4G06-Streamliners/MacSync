import { Platform } from 'react-native';
import { getAuthToken } from './auth';

// Android emulator uses 10.0.2.2, iOS simulator/web uses localhost
const getBaseUrl = () => {
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
  user: User | null;
}

export function requestVerificationCode(email: string) {
  return apiFetch('/auth/request-code', {
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

export function registerProfile(data: {
  firstName: string;
  lastName: string;
  phone: string;
  program: string;
}) {
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
  return apiFetch('/events');
}

export function getEvent(id: number): Promise<EventItem> {
  return apiFetch(`/events/${id}`);
}

export interface CreateEventPayload {
  name: string;
  description?: string;
  date: string;
  location?: string;
  capacity: number;
  imageUrl?: string;
  price: number;
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
): Promise<{ ticket?: any; error?: string }> {
  return apiFetch(`/events/${eventId}/signup`, {
    method: 'POST',
  });
}

export function cancelSignup(
  eventId: number,
): Promise<{ cancelled?: boolean; error?: string }> {
  return apiFetch(`/events/${eventId}/cancel`, {
    method: 'POST',
  });
}
