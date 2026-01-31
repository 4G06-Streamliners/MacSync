# Database schema & seed

## Tables

- **users** – Profile (email, name, phoneNumber, program, isSystemAdmin)
- **roles** – Role names (Admin, Member, Guest)
- **user_roles** – Many-to-many user ↔ role
- **events** – Events with optional table/bus config:
  - `tableCount`, `seatsPerTable` → table seats (user picks table + seat)
  - `busCount`, `busCapacity` → bus seats (auto-assign next available)
- **tickets** – User + event; optional `tableSeat` / `busSeat` display strings
- **table_seats** – One row per physical seat per event; `ticketId` when taken
- **bus_seats** – One row per bus seat per event; `ticketId` when taken

## Setup for new users

1. **Push schema**
   ```bash
   npm run db:push
   ```
   If you have existing data and want to reset: `npm run db:push:force`

2. **Seed sample data (roles, users, events, table/bus seats, tickets)**
   ```bash
   npm run db:seed
   ```

3. **Or do both**
   ```bash
   npm run db:setup
   ```

## Run seed on app startup

Set in `.env`:
```env
RUN_SEED=true
```
Then start the app; seed runs once if the DB is empty (idempotent).

## Auto-generating seats when creating an event

After inserting an event with `tableCount`/`seatsPerTable` or `busCount`/`busCapacity`, generate seat rows:

- **Table seats:** For each table 1..tableCount and seat 1..seatsPerTable, insert into `table_seats` (eventId, tableNumber, seatNumber).
- **Bus seats:** For each bus 1..busCount and seat 1..busCapacity, insert into `bus_seats` (eventId, busNumber, seatNumber).

See `seed-data.ts` for the exact loops. You can extract those into shared helpers (e.g. `createTableSeatsForEvent(db, eventId, tableCount, seatsPerTable)` and `createBusSeatsForEvent(db, eventId, busCount, busCapacity)`).

## Assigning seats

- **Table:** User picks (tableNumber, seatNumber). Find `table_seats` row where eventId + tableNumber + seatNumber and ticketId is null; set ticketId and update ticket.tableSeat for display.
- **Bus:** Find first `bus_seats` row for the event where ticketId is null; set ticketId and update ticket.busSeat (e.g. "Bus 1 - Seat 5").
