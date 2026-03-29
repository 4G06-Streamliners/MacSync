/**
 * Shared seed logic: used by CLI (seed.ts) and optionally by Nest on startup (RUN_SEED=true).
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';
import {
  users,
  roles,
  userRoles,
  events,
  tickets,
  tableSeats,
  busSeats,
  type Ticket,
  type TableSeat,
  type BusSeat,
} from './schema';
import { eq } from 'drizzle-orm';

export type SeedDb = NodePgDatabase<typeof schema>;

export async function runSeedDb(db: SeedDb): Promise<boolean> {
  const existingRoles = await db.select().from(roles).limit(1);
  if (existingRoles.length > 0) {
    return false; // already seeded
  }

  const [roleAdmin, roleMember, roleMesAdmin] = await db
    .insert(roles)
    .values([{ name: 'Admin' }, { name: 'Member' }, { name: 'MES_ADMIN' }])
    .returning();

  const [user1, user2, user3] = await db
    .insert(users)
    .values([
      {
        email: 'admin@mcmaster.ca',
        name: 'Admin User',
        firstName: 'Admin',
        lastName: 'User',
        phoneNumber: '+15551234567',
        program: 'CS',
        isSystemAdmin: true,
        passwordHash:
          '$2b$10$gNGCkz3TUVsAJOaBK1ttW..Vjx6AQJkqw0l34eiAFf.rKsqqYF7o6', // e.g. for Password123
      },
      {
        email: 'alice@mcmaster.ca',
        name: 'Alice Smith',
        firstName: 'Alice',
        lastName: 'Smith',
        phoneNumber: '+15559876543',
        program: 'Engineering',
        // Same dev password as admin (Password123).
        passwordHash:
          '$2b$10$gNGCkz3TUVsAJOaBK1ttW..Vjx6AQJkqw0l34eiAFf.rKsqqYF7o6',
      },
      {
        email: 'bob@mcmaster.ca',
        name: 'Bob Jones',
        firstName: 'Bob',
        lastName: 'Jones',
        phoneNumber: '+15555555555',
        program: 'Science',
        // Same dev password as admin (Password123).
        passwordHash:
          '$2b$10$gNGCkz3TUVsAJOaBK1ttW..Vjx6AQJkqw0l34eiAFf.rKsqqYF7o6',
      },
    ])
    .returning();
  if (!user1 || !user2 || !user3) throw new Error('User insert failed');

  await db.insert(userRoles).values([
    { userId: user1.id, roleId: roleAdmin.id },
    { userId: user2.id, roleId: roleMember.id },
    { userId: user2.id, roleId: roleMesAdmin.id },
    { userId: user3.id, roleId: roleMember.id },
  ]);

  const [event1, event2] = await db
    .insert(events)
    .values([
      {
        name: 'Annual Gala 2026',
        description: 'Dinner and awards night',
        date: new Date('2026-03-15T19:00:00'),
        location: 'Grand Ballroom',
        capacity: 100,
        price: 5000,
        stripePriceId: 'price_1SzRO1AOwjDlyX8ctKxSG200',
        stripeProductId: 'prod_TxM6pjhnD6u04y',
        requiresTableSignup: true,
        requiresBusSignup: true,
        tableCount: 5,
        seatsPerTable: 8,
        busCount: 2,
        busCapacity: 25,
      },
      {
        name: 'Tech Meetup',
        description: 'Monthly tech talk',
        date: new Date('2026-02-10T18:00:00'),
        location: 'Conference Room A',
        capacity: 30,
        price: 0,
        requiresTableSignup: true,
        requiresBusSignup: false,
        tableCount: 3,
        seatsPerTable: 4,
        busCount: 0,
        busCapacity: 0,
      },
    ])
    .returning();
  if (!event1 || !event2) throw new Error('Event insert failed');

  // Option A (role-based scoping):
  // - Annual Gala managed by global Admin role
  // - Tech Meetup managed by MES_ADMIN role
  await db
    .update(events)
    .set({ managingRoleId: roleAdmin.id, updatedAt: new Date() })
    .where(eq(events.id, event1.id));

  await db
    .update(events)
    .set({ managingRoleId: roleMesAdmin.id, updatedAt: new Date() })
    .where(eq(events.id, event2.id));

  const tableSeatRows: Array<{
    eventId: number;
    tableNumber: number;
    seatNumber: number;
  }> = [];
  for (const ev of [event1, event2]) {
    const tableCount = ev.tableCount ?? 0;
    const seatsPerTable = ev.seatsPerTable ?? 0;
    for (let t = 1; t <= tableCount; t++) {
      for (let s = 1; s <= seatsPerTable; s++) {
        tableSeatRows.push({
          eventId: ev.id,
          tableNumber: t,
          seatNumber: s,
        });
      }
    }
  }
  if (tableSeatRows.length > 0)
    await db.insert(tableSeats).values(tableSeatRows);

  const busSeatRows: Array<{
    eventId: number;
    busNumber: number;
    seatNumber: number;
  }> = [];
  for (const ev of [event1]) {
    const busCount = ev.busCount ?? 0;
    const busCapacity = ev.busCapacity ?? 0;
    for (let b = 1; b <= busCount; b++) {
      for (let s = 1; s <= busCapacity; s++) {
        busSeatRows.push({
          eventId: ev.id,
          busNumber: b,
          seatNumber: s,
        });
      }
    }
  }
  if (busSeatRows.length > 0) await db.insert(busSeats).values(busSeatRows);

  // Check if tickets already exist
  const existingTickets = await db.select().from(tickets).limit(1);
  let ticket1: Ticket | undefined;
  let ticket2: Ticket | undefined;
  let ticket3: Ticket | undefined;

  if (existingTickets.length > 0) {
    // Update existing tickets with QR codes
    const allTickets: Ticket[] = await db.select().from(tickets);
    for (const ticket of allTickets) {
      const qrData = `TICKET:${ticket.userId}:${ticket.eventId}:${ticket.id}:${Date.now()}`;
      await db
        .update(tickets)
        .set({ qrCodeData: qrData, updatedAt: new Date() })
        .where(eq(tickets.id, ticket.id));
    }
    // Get first 3 for seat assignment
    ticket1 = allTickets[0];
    ticket2 = allTickets[1];
    ticket3 = allTickets[2];
  } else {
    // Create new tickets with QR codes
    const timestamp = Date.now();
    const [t1, t2, t3] = await db
      .insert(tickets)
      .values([
        {
          userId: user1.id,
          eventId: event1.id,
          qrCodeData: `TICKET:${user1.id}:${event1.id}:temp1:${timestamp}`,
        },
        {
          userId: user2.id,
          eventId: event1.id,
          qrCodeData: `TICKET:${user2.id}:${event1.id}:temp2:${timestamp}`,
        },
        {
          userId: user3.id,
          eventId: event2.id,
          qrCodeData: `TICKET:${user3.id}:${event2.id}:temp3:${timestamp}`,
        },
      ])
      .returning();

    // Update with actual ticket IDs
    if (t1) {
      await db
        .update(tickets)
        .set({
          qrCodeData: `TICKET:${user1.id}:${event1.id}:${t1.id}:${timestamp}`,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, t1.id));
    }
    if (t2) {
      await db
        .update(tickets)
        .set({
          qrCodeData: `TICKET:${user2.id}:${event1.id}:${t2.id}:${timestamp}`,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, t2.id));
    }
    if (t3) {
      await db
        .update(tickets)
        .set({
          qrCodeData: `TICKET:${user3.id}:${event2.id}:${t3.id}:${timestamp}`,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, t3.id));
    }

    ticket1 = t1;
    ticket2 = t2;
    ticket3 = t3;
  }

  if (!ticket1 || !ticket2 || !ticket3) throw new Error('Ticket insert failed');

  if (ticket1 && ticket2) {
    const tableSeatResults: TableSeat[] = await db
      .select()
      .from(tableSeats)
      .where(eq(tableSeats.eventId, event1.id))
      .limit(1);
    const tableSeat: TableSeat | undefined = tableSeatResults[0];
    if (tableSeat) {
      await db
        .update(tableSeats)
        .set({ ticketId: ticket1.id, updatedAt: new Date() })
        .where(eq(tableSeats.id, tableSeat.id));
      await db
        .update(tickets)
        .set({
          tableSeat: `Table ${tableSeat.tableNumber}, Seat ${tableSeat.seatNumber}`,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticket1.id));
    }

    const busSeatResults: BusSeat[] = await db
      .select()
      .from(busSeats)
      .where(eq(busSeats.eventId, event1.id))
      .limit(1);
    const busSeat: BusSeat | undefined = busSeatResults[0];
    if (busSeat) {
      await db
        .update(busSeats)
        .set({ ticketId: ticket2.id, updatedAt: new Date() })
        .where(eq(busSeats.id, busSeat.id));
      await db
        .update(tickets)
        .set({
          busSeat: `Bus ${busSeat.busNumber} - Seat ${busSeat.seatNumber}`,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticket2.id));
    }
  }

  return true;
}

/**
 * Upsert missing table seat rows for an event (idempotent). Used on create and when
 * admins expand tableCount / seatsPerTable via event update.
 */
export async function ensureTableSeatsForEvent(
  db: SeedDb,
  eventId: number,
  tableCount: number,
  seatsPerTable: number,
): Promise<void> {
  const rows: Array<{
    eventId: number;
    tableNumber: number;
    seatNumber: number;
  }> = [];
  for (let t = 1; t <= tableCount; t++) {
    for (let s = 1; s <= seatsPerTable; s++) {
      rows.push({ eventId, tableNumber: t, seatNumber: s });
    }
  }
  if (rows.length === 0) return;
  await db
    .insert(tableSeats)
    .values(rows)
    .onConflictDoNothing({
      target: [
        tableSeats.eventId,
        tableSeats.tableNumber,
        tableSeats.seatNumber,
      ],
    });
}

/**
 * Insert missing bus seat rows only (bus_seats has no composite unique in schema).
 */
export async function ensureBusSeatsForEvent(
  db: SeedDb,
  eventId: number,
  busCount: number,
  busCapacity: number,
): Promise<void> {
  const existing = await db
    .select({
      busNumber: busSeats.busNumber,
      seatNumber: busSeats.seatNumber,
    })
    .from(busSeats)
    .where(eq(busSeats.eventId, eventId));

  const taken = new Set(
    existing.map((r) => `${r.busNumber}:${r.seatNumber}`),
  );

  const rows: Array<{
    eventId: number;
    busNumber: number;
    seatNumber: number;
  }> = [];
  for (let b = 1; b <= busCount; b++) {
    for (let s = 1; s <= busCapacity; s++) {
      const k = `${b}:${s}`;
      if (!taken.has(k)) {
        rows.push({ eventId, busNumber: b, seatNumber: s });
        taken.add(k);
      }
    }
  }
  if (rows.length > 0) await db.insert(busSeats).values(rows);
}

/**
 * Call after creating an event with tableCount + seatsPerTable to create all table seat rows.
 */
export async function createTableSeatsForEvent(
  db: SeedDb,
  eventId: number,
  tableCount: number,
  seatsPerTable: number,
): Promise<void> {
  await ensureTableSeatsForEvent(db, eventId, tableCount, seatsPerTable);
}

/**
 * Call after creating an event with busCount + busCapacity to create all bus seat rows (auto-assign later).
 */
export async function createBusSeatsForEvent(
  db: SeedDb,
  eventId: number,
  busCount: number,
  busCapacity: number,
): Promise<void> {
  await ensureBusSeatsForEvent(db, eventId, busCount, busCapacity);
}

/** Stable name prefix so we can re-run seed idempotently on VPS / CI. */
export const PRESET_EVENT_NAME_PREFIX = 'MacSync Preset:';

/**
 * Ensures 4 demo events exist (mixed paid/free, table/bus/none). Safe to run on every
 * `npm run db:seed` — skips any preset whose name already exists.
 */
export async function seedPresetDemoEvents(db: SeedDb): Promise<{
  inserted: number;
  skipped: number;
}> {
  let inserted = 0;
  let skipped = 0;

  const adminRoleRow = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'Admin'))
    .limit(1);
  const mesAdminRoleRow = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'MES_ADMIN'))
    .limit(1);
  const adminRoleId = adminRoleRow[0]?.id ?? null;
  const mesAdminRoleId = mesAdminRoleRow[0]?.id ?? null;

  const presets: Array<{
    name: string;
    description: string;
    date: Date;
    location: string;
    capacity: number;
    imageUrl: string;
    price: number;
    requiresTableSignup: boolean;
    requiresBusSignup: boolean;
    tableCount: number | null;
    seatsPerTable: number | null;
    busCount: number | null;
    busCapacity: number | null;
  }> = [
    {
      name: `${PRESET_EVENT_NAME_PREFIX} Riverfront Gala`,
      description:
        'Paid dinner: assigned tables and charter bus from campus. Table and bus seat counts match capacity.',
      date: new Date('2026-06-20T18:00:00Z'),
      location: 'Riverfront Convention Center',
      capacity: 36,
      imageUrl:
        'https://images.unsplash.com/photo-1540575467063-027aef3d3087?auto=format&fit=crop&w=1200&q=80',
      price: 4500,
      requiresTableSignup: true,
      requiresBusSignup: true,
      tableCount: 6,
      seatsPerTable: 6,
      busCount: 2,
      busCapacity: 18,
    },
    {
      name: `${PRESET_EVENT_NAME_PREFIX} Engineering Workshop`,
      description:
        'Paid hands-on workshop; pick a table seat. No bus — attendees make their own way.',
      date: new Date('2026-07-08T14:00:00Z'),
      location: 'JHE Annex Lab',
      capacity: 20,
      imageUrl:
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      price: 2999,
      requiresTableSignup: true,
      requiresBusSignup: false,
      tableCount: 5,
      seatsPerTable: 4,
      busCount: 0,
      busCapacity: 0,
    },
    {
      name: `${PRESET_EVENT_NAME_PREFIX} Campus Shuttle Day`,
      description:
        'Free open day; bus seats auto-assigned. No table selection.',
      date: new Date('2026-08-15T10:00:00Z'),
      location: 'Main Campus Loop',
      capacity: 48,
      imageUrl:
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      price: 0,
      requiresTableSignup: false,
      requiresBusSignup: true,
      tableCount: 0,
      seatsPerTable: 0,
      busCount: 2,
      busCapacity: 24,
    },
    {
      name: `${PRESET_EVENT_NAME_PREFIX} Fall Open House`,
      description:
        'Free general admission — no table or bus signup. First come, first served.',
      date: new Date('2026-09-05T16:00:00Z'),
      location: 'Student Centre Great Hall',
      capacity: 150,
      imageUrl:
        'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
      price: 0,
      requiresTableSignup: false,
      requiresBusSignup: false,
      tableCount: 0,
      seatsPerTable: 0,
      busCount: 0,
      busCapacity: 0,
    },
  ];

  for (const preset of presets) {
    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.name, preset.name))
      .limit(1);
    if (existing[0]) {
      skipped++;
      continue;
    }

    const [row] = await db
      .insert(events)
      .values({
        name: preset.name,
        description: preset.description,
        date: preset.date,
        location: preset.location,
        capacity: preset.capacity,
        imageUrl: preset.imageUrl,
        price: preset.price,
        stripePriceId: null,
        stripeProductId: null,
        requiresTableSignup: preset.requiresTableSignup,
        requiresBusSignup: preset.requiresBusSignup,
        tableCount: preset.tableCount,
        seatsPerTable: preset.seatsPerTable,
        busCount: preset.busCount,
        busCapacity: preset.busCapacity,
        managingRoleId:
          preset.name.includes('Engineering Workshop') &&
          mesAdminRoleId != null
            ? mesAdminRoleId
            : adminRoleId,
      })
      .returning();

    if (!row) continue;
    inserted++;

    if (row.requiresTableSignup && row.tableCount && row.seatsPerTable) {
      await ensureTableSeatsForEvent(
        db,
        row.id,
        row.tableCount,
        row.seatsPerTable,
      );
    }
    if (row.requiresBusSignup && row.busCount && row.busCapacity) {
      await ensureBusSeatsForEvent(
        db,
        row.id,
        row.busCount,
        row.busCapacity,
      );
    }
  }

  return { inserted, skipped };
}
