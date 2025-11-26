import {
  db,
  eq,
  and,
  count,
  sql,
  userInstanceAccess,
  instances,
  users,
} from '@large-event/database';
import { busRoutes, busSignups, eventTables, tableSignups, eventRsvps } from '@teamd/database/overlays';
import type {
  BusRouteSummary,
  BusSignupResponse,
  CreateBusSignupRequest,
  CreateRsvpSignupRequest,
  CreateTableSignupRequest,
  EventTableSummary,
  SignupListResponse,
  SignupStatus,
  SignupSummaryResponse,
  TableSignupResponse,
  RsvpSignupResponse,
  UpdateSignupStatusRequest,
} from '@teamd/api-types';

type AccessLevel = 'web_user' | 'web_admin' | 'both';

const ADMIN_LEVELS: AccessLevel[] = ['web_admin', 'both'];
const USER_LEVELS: AccessLevel[] = ['web_user', 'both'];
const DEFAULT_RSVP_CAPACITY = 250;

export class SignupServiceError extends Error {
  constructor(
    message: string,
    public statusCode = 400
  ) {
    super(message);
  }
}

export async function ensureInstanceAccess(
  userId: number,
  instanceId: number,
  required: 'admin' | 'user'
) {
  const allowed = required === 'admin' ? ADMIN_LEVELS : USER_LEVELS;
  const [access] = await db
    .select({
      level: userInstanceAccess.accessLevel,
    })
    .from(userInstanceAccess)
    .where(and(eq(userInstanceAccess.userId, userId), eq(userInstanceAccess.instanceId, instanceId)))
    .limit(1);

  if (!access || !allowed.includes(access.level as AccessLevel)) {
    throw new SignupServiceError('Access denied for this event', 403);
  }
}

export async function getInstance(instanceId: number) {
  const [instance] = await db
    .select({
      id: instances.id,
      name: instances.name,
    })
    .from(instances)
    .where(eq(instances.id, instanceId))
    .limit(1);

  if (!instance) {
    throw new SignupServiceError('Event instance not found', 404);
  }

  return instance;
}

export async function listBusRoutes(instanceId: number): Promise<BusRouteSummary[]> {
  const routes = await db
    .select()
    .from(busRoutes)
    .where(eq(busRoutes.instanceId, instanceId));

  if (routes.length === 0) {
    return [];
  }

  const signupCounts = await db
    .select({
      routeId: busSignups.routeId,
      confirmed: count(sql`CASE WHEN ${busSignups.status} = 'confirmed' THEN 1 END`),
      waitlisted: count(sql`CASE WHEN ${busSignups.status} = 'waitlisted' THEN 1 END`),
    })
    .from(busSignups)
    .where(eq(busSignups.instanceId, instanceId))
    .groupBy(busSignups.routeId);

  return routes.map((route) => {
    const summary = signupCounts.find((s) => s.routeId === route.id);
    const confirmed = summary?.confirmed ?? 0;
    const waitlisted = summary?.waitlisted ?? 0;

    return {
      id: route.id,
      instanceId: route.instanceId,
      name: route.name,
      description: route.description,
      capacity: route.capacity,
      waitlistCapacity: route.waitlistCapacity,
      departureLocation: route.departureLocation,
      departureTime: route.departureTime?.toISOString() ?? null,
      seatsRemaining: Math.max(route.capacity - confirmed, 0),
      waitlistCount: waitlisted,
    };
  });
}

export async function listEventTables(instanceId: number): Promise<EventTableSummary[]> {
  const tables = await db.select().from(eventTables).where(eq(eventTables.instanceId, instanceId));

  if (tables.length === 0) {
    return [];
  }

  const seatTotals = await db
    .select({
      tableId: tableSignups.tableId,
      confirmedSeats: sql<number>`coalesce(sum(
        CASE WHEN ${tableSignups.status} = 'confirmed' THEN ${tableSignups.seatsRequested} ELSE 0 END
      ), 0)`,
    })
    .from(tableSignups)
    .where(eq(tableSignups.instanceId, instanceId))
    .groupBy(tableSignups.tableId);

  return tables.map((table) => {
    const usage = seatTotals.find((s) => s.tableId === table.id);
    const confirmedSeats = usage?.confirmedSeats ?? 0;

    return {
      id: table.id,
      instanceId: table.instanceId,
      label: table.label,
      capacity: table.capacity,
      location: table.location,
      seatsRemaining: Math.max(table.capacity - confirmedSeats, 0),
    };
  });
}

export async function createBusSignup(
  userId: number,
  instanceId: number,
  payload: CreateBusSignupRequest
): Promise<BusSignupResponse> {
  const route = await db
    .select()
    .from(busRoutes)
    .where(and(eq(busRoutes.id, payload.routeId), eq(busRoutes.instanceId, instanceId)))
    .limit(1);

  if (route.length === 0) {
    throw new SignupServiceError('Bus route not found', 404);
  }

  const [counts] = await db
    .select({
      confirmed: count(sql`CASE WHEN ${busSignups.status} = 'confirmed' THEN 1 END`),
      waitlisted: count(sql`CASE WHEN ${busSignups.status} = 'waitlisted' THEN 1 END`),
    })
    .from(busSignups)
    .where(eq(busSignups.routeId, payload.routeId));

  const status: SignupStatus =
    (counts?.confirmed ?? 0) < route[0].capacity ? 'confirmed' : 'waitlisted';
  const waitlistPosition =
    status === 'waitlisted' ? ((counts?.waitlisted ?? 0) + 1) : null;

  const [signup] = await db
    .insert(busSignups)
    .values({
      instanceId,
      routeId: payload.routeId,
      userId,
      status,
      waitlistPosition: waitlistPosition ?? undefined,
      notes: payload.notes,
    })
    .onConflictDoUpdate({
      target: [busSignups.routeId, busSignups.userId],
      set: {
        status,
        waitlistPosition: waitlistPosition ?? null,
        notes: payload.notes,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    id: signup.id,
    instanceId: signup.instanceId,
    userId: signup.userId,
    status: signup.status as SignupStatus,
    waitlistPosition: signup.waitlistPosition ?? undefined,
    type: 'bus',
    routeId: payload.routeId,
  };
}

export async function createTableSignup(
  userId: number,
  instanceId: number,
  payload: CreateTableSignupRequest
): Promise<TableSignupResponse> {
  const tableRecord = await db
    .select()
    .from(eventTables)
    .where(and(eq(eventTables.id, payload.tableId), eq(eventTables.instanceId, instanceId)))
    .limit(1);

  if (tableRecord.length === 0) {
    throw new SignupServiceError('Table not found', 404);
  }

  const seatsRequested = payload.seatsRequested && payload.seatsRequested > 0 ? payload.seatsRequested : 1;

  const [usage] = await db
    .select({
      confirmedSeats: sql<number>`coalesce(sum(
        CASE WHEN ${tableSignups.status} = 'confirmed' THEN ${tableSignups.seatsRequested} ELSE 0 END
      ), 0)`,
      waitlistedSeats: sql<number>`coalesce(sum(
        CASE WHEN ${tableSignups.status} = 'waitlisted' THEN ${tableSignups.seatsRequested} ELSE 0 END
      ), 0)`,
    })
    .from(tableSignups)
    .where(eq(tableSignups.tableId, payload.tableId));

  const confirmedSeats = usage?.confirmedSeats ?? 0;
  const openSeats = Math.max(tableRecord[0].capacity - confirmedSeats, 0);

  const status: SignupStatus = openSeats >= seatsRequested ? 'confirmed' : 'waitlisted';
  const waitlistPosition =
    status === 'waitlisted' ? ((usage?.waitlistedSeats ?? 0) + seatsRequested) : null;

  const [signup] = await db
    .insert(tableSignups)
    .values({
      instanceId,
      tableId: payload.tableId,
      userId,
      groupName: payload.groupName,
      seatsRequested,
      status,
      waitlistPosition: waitlistPosition ?? undefined,
      notes: payload.notes,
    })
    .onConflictDoUpdate({
      target: [tableSignups.tableId, tableSignups.userId],
      set: {
        status,
        seatsRequested,
        groupName: payload.groupName,
        notes: payload.notes,
        waitlistPosition: waitlistPosition ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    id: signup.id,
    instanceId: signup.instanceId,
    userId: signup.userId,
    status: signup.status as SignupStatus,
    waitlistPosition: signup.waitlistPosition ?? undefined,
    type: 'table',
    tableId: payload.tableId,
    groupName: signup.groupName ?? undefined,
    seatsRequested: signup.seatsRequested,
  };
}

export async function createRsvpSignup(
  userId: number,
  instanceId: number,
  payload: CreateRsvpSignupRequest
): Promise<RsvpSignupResponse> {
  const [usage] = await db
    .select({
      confirmed: count(sql`CASE WHEN ${eventRsvps.status} = 'confirmed' THEN 1 END`),
      waitlisted: count(sql`CASE WHEN ${eventRsvps.status} = 'waitlisted' THEN 1 END`),
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.instanceId, instanceId));

  const status: SignupStatus =
    (usage?.confirmed ?? 0) < DEFAULT_RSVP_CAPACITY ? 'confirmed' : 'waitlisted';
  const waitlistPosition = status === 'waitlisted' ? ((usage?.waitlisted ?? 0) + 1) : null;

  const [signup] = await db
    .insert(eventRsvps)
    .values({
      instanceId,
      userId,
      status,
      waitlistPosition: waitlistPosition ?? undefined,
      notes: payload.notes,
    })
    .onConflictDoUpdate({
      target: [eventRsvps.instanceId, eventRsvps.userId],
      set: {
        status,
        waitlistPosition: waitlistPosition ?? null,
        notes: payload.notes,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    id: signup.id,
    instanceId: signup.instanceId,
    userId: signup.userId,
    status: signup.status as SignupStatus,
    waitlistPosition: signup.waitlistPosition ?? undefined,
    type: 'rsvp',
  };
}

export async function listSignupsForInstance(
  instanceId: number
): Promise<SignupListResponse> {
  const [bus, tables, rsvps] = await Promise.all([
    db
      .select({
        signup: busSignups,
        userEmail: users.email,
        userName: users.name,
        routeName: busRoutes.name,
      })
      .from(busSignups)
      .innerJoin(users, eq(users.id, busSignups.userId))
      .innerJoin(busRoutes, eq(busRoutes.id, busSignups.routeId))
      .where(eq(busSignups.instanceId, instanceId)),
    db
      .select({
        signup: tableSignups,
        userEmail: users.email,
        userName: users.name,
        tableLabel: eventTables.label,
      })
      .from(tableSignups)
      .innerJoin(users, eq(users.id, tableSignups.userId))
      .innerJoin(eventTables, eq(eventTables.id, tableSignups.tableId))
      .where(eq(tableSignups.instanceId, instanceId)),
    db
      .select({
        signup: eventRsvps,
        userEmail: users.email,
        userName: users.name,
      })
      .from(eventRsvps)
      .innerJoin(users, eq(users.id, eventRsvps.userId))
      .where(eq(eventRsvps.instanceId, instanceId)),
  ]);

  const busResponses: BusSignupResponse[] = bus.map((entry) => ({
    id: entry.signup.id,
    instanceId: entry.signup.instanceId,
    userId: entry.signup.userId,
    userEmail: entry.userEmail,
    userName: entry.userName,
    status: entry.signup.status as SignupStatus,
    waitlistPosition: entry.signup.waitlistPosition ?? undefined,
    type: 'bus',
    routeId: entry.signup.routeId,
    routeName: entry.routeName,
    notes: entry.signup.notes ?? undefined,
    actedBy: entry.signup.actedBy ?? undefined,
  }));

  const tableResponses: TableSignupResponse[] = tables.map((entry) => ({
    id: entry.signup.id,
    instanceId: entry.signup.instanceId,
    userId: entry.signup.userId,
    userEmail: entry.userEmail,
    userName: entry.userName,
    status: entry.signup.status as SignupStatus,
    waitlistPosition: entry.signup.waitlistPosition ?? undefined,
    type: 'table',
    tableId: entry.signup.tableId,
    tableLabel: entry.tableLabel,
    groupName: entry.signup.groupName ?? undefined,
    seatsRequested: entry.signup.seatsRequested,
    notes: entry.signup.notes ?? undefined,
    actedBy: entry.signup.actedBy ?? undefined,
  }));

  const rsvpResponses: RsvpSignupResponse[] = rsvps.map((entry) => ({
    id: entry.signup.id,
    instanceId: entry.signup.instanceId,
    userId: entry.signup.userId,
    userEmail: entry.userEmail,
    userName: entry.userName,
    status: entry.signup.status as SignupStatus,
    waitlistPosition: entry.signup.waitlistPosition ?? undefined,
    type: 'rsvp',
    notes: entry.signup.notes ?? undefined,
    actedBy: entry.signup.actedBy ?? undefined,
  }));

  return {
    signups: [...busResponses, ...tableResponses, ...rsvpResponses],
    count: busResponses.length + tableResponses.length + rsvpResponses.length,
  };
}

export async function listUserSignups(
  userId: number,
  instanceId?: number
): Promise<SignupSummaryResponse> {
  const busFilter = instanceId ? and(eq(busSignups.userId, userId), eq(busSignups.instanceId, instanceId)) : eq(busSignups.userId, userId);
  const tableFilter = instanceId ? and(eq(tableSignups.userId, userId), eq(tableSignups.instanceId, instanceId)) : eq(tableSignups.userId, userId);
  const rsvpFilter = instanceId ? and(eq(eventRsvps.userId, userId), eq(eventRsvps.instanceId, instanceId)) : eq(eventRsvps.userId, userId);

  const [bus, tables, rsvps] = await Promise.all([
    db.select().from(busSignups).where(busFilter),
    db.select().from(tableSignups).where(tableFilter),
    db.select().from(eventRsvps).where(rsvpFilter),
  ]);

  return {
    bus: bus.map((signup) => ({
      id: signup.id,
      instanceId: signup.instanceId,
      userId: signup.userId,
      status: signup.status as SignupStatus,
      waitlistPosition: signup.waitlistPosition ?? undefined,
      type: 'bus',
      routeId: signup.routeId,
    })),
    tables: tables.map((signup) => ({
      id: signup.id,
      instanceId: signup.instanceId,
      userId: signup.userId,
      status: signup.status as SignupStatus,
      waitlistPosition: signup.waitlistPosition ?? undefined,
      type: 'table',
      tableId: signup.tableId,
      groupName: signup.groupName ?? undefined,
      seatsRequested: signup.seatsRequested,
    })),
    rsvps: rsvps.map((signup) => ({
      id: signup.id,
      instanceId: signup.instanceId,
      userId: signup.userId,
      status: signup.status as SignupStatus,
      waitlistPosition: signup.waitlistPosition ?? undefined,
      type: 'rsvp',
    })),
  };
}

export async function updateSignupStatus(
  signupId: number,
  payload: UpdateSignupStatusRequest
) {
  if (payload.type === 'bus') {
    const [updated] = await db
      .update(busSignups)
      .set({
        status: payload.status,
        waitlistPosition: payload.waitlistPosition ?? null,
        notes: payload.notes,
        updatedAt: new Date(),
      })
      .where(eq(busSignups.id, signupId))
      .returning();

    if (!updated) throw new SignupServiceError('Signup not found', 404);
    return updated;
  }

  if (payload.type === 'table') {
    const [updated] = await db
      .update(tableSignups)
      .set({
        status: payload.status,
        waitlistPosition: payload.waitlistPosition ?? null,
        notes: payload.notes,
        updatedAt: new Date(),
      })
      .where(eq(tableSignups.id, signupId))
      .returning();

    if (!updated) throw new SignupServiceError('Signup not found', 404);
    return updated;
  }

  const [updated] = await db
    .update(eventRsvps)
    .set({
      status: payload.status,
      waitlistPosition: payload.waitlistPosition ?? null,
      notes: payload.notes,
      updatedAt: new Date(),
    })
    .where(eq(eventRsvps.id, signupId))
    .returning();

  if (!updated) throw new SignupServiceError('Signup not found', 404);
  return updated;
}

export async function getSignupInstance(signupId: number, type: 'bus' | 'table' | 'rsvp') {
  if (type === 'bus') {
    const [record] = await db
      .select({ instanceId: busSignups.instanceId })
      .from(busSignups)
      .where(eq(busSignups.id, signupId))
      .limit(1);
    if (!record) throw new SignupServiceError('Signup not found', 404);
    return record.instanceId;
  }

  if (type === 'table') {
    const [record] = await db
      .select({ instanceId: tableSignups.instanceId })
      .from(tableSignups)
      .where(eq(tableSignups.id, signupId))
      .limit(1);
    if (!record) throw new SignupServiceError('Signup not found', 404);
    return record.instanceId;
  }

  const [record] = await db
    .select({ instanceId: eventRsvps.instanceId })
    .from(eventRsvps)
    .where(eq(eventRsvps.id, signupId))
    .limit(1);

  if (!record) throw new SignupServiceError('Signup not found', 404);
  return record.instanceId;
}

