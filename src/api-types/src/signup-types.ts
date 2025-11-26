export type SignupStatus = 'pending' | 'confirmed' | 'waitlisted' | 'cancelled';

export interface BusRouteSummary {
  id: number;
  instanceId: number;
  name: string;
  description?: string | null;
  capacity: number;
  waitlistCapacity: number;
  departureLocation?: string | null;
  departureTime?: string | null;
  seatsRemaining: number;
  waitlistCount: number;
}

export interface EventTableSummary {
  id: number;
  instanceId: number;
  label: string;
  capacity: number;
  location?: string | null;
  seatsRemaining: number;
}

export interface BaseSignup {
  id: number;
  instanceId: number;
  userId: number;
  userEmail?: string;
  userName?: string;
  status: SignupStatus;
  waitlistPosition?: number | null;
  notes?: string | null;
  actedBy?: number | null;
  updatedAt?: string;
}

export interface BusSignupResponse extends BaseSignup {
  type: 'bus';
  routeId: number;
  routeName?: string;
}

export interface TableSignupResponse extends BaseSignup {
  type: 'table';
  tableId: number;
  tableLabel?: string;
  groupName?: string | null;
  seatsRequested: number;
}

export interface RsvpSignupResponse extends BaseSignup {
  type: 'rsvp';
}

export type SignupResponse = BusSignupResponse | TableSignupResponse | RsvpSignupResponse;

export interface CreateBusSignupRequest {
  routeId: number;
  notes?: string;
}

export interface CreateTableSignupRequest {
  tableId: number;
  seatsRequested?: number;
  groupName?: string;
  notes?: string;
}

export interface CreateRsvpSignupRequest {
  notes?: string;
}

export interface UpdateSignupStatusRequest {
  type: 'bus' | 'table' | 'rsvp';
  status: SignupStatus;
  waitlistPosition?: number | null;
  notes?: string;
}

export interface SignupListResponse {
  signups: SignupResponse[];
  count: number;
}

export interface SignupSummaryResponse {
  bus: BusSignupResponse[];
  tables: TableSignupResponse[];
  rsvps: RsvpSignupResponse[];
}

