import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from './database/database.service';
import {
  users,
  roles,
  userRoles,
  events,
  tickets,
  tableSeats,
  busSeats,
} from './db/schema';

@Injectable()
export class AppService {
  constructor(private readonly dbService: DatabaseService) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Demo: insert a sample user, fetch it, and return (also prints to server console).
   */
  async runDemo() {
    const db = this.dbService.db;

    // 1. Insert a sample user (unique email so we can run multiple times)
    const sampleEmail = `demo-${Date.now()}@example.com`;
    const [inserted] = await db
      .insert(users)
      .values({
        name: 'Demo User',
        email: sampleEmail,
        phoneNumber: '+15550000000',
      })
      .returning();

    if (!inserted) {
      return { error: 'Insert failed' };
    }

    // 2. Fetch the user we just inserted by ID
    const [fetchedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, inserted.id));

    // 3. Fetch all users
    const allUsers = await db.select().from(users);

    // 4. Print to server console
    console.log('--- Demo: Insert & Fetch from PostgreSQL ---');
    console.log('Inserted:', JSON.stringify(inserted, null, 2));
    console.log('Fetched by ID:', JSON.stringify(fetchedUser, null, 2));
    console.log('All users count:', allUsers.length);
    console.log('---------------------------------------------');

    return {
      message: 'Inserted sample user, fetched it, and listed all users.',
      inserted,
      fetched: fetchedUser,
      allUsers,
    };
  }

  /**
   * Return all rows from every table (for debugging / admin).
   */
  async getAllTables() {
    const db = this.dbService.db;
    const [
      usersRows,
      rolesRows,
      userRolesRows,
      eventsRows,
      ticketsRows,
      tableSeatsRows,
      busSeatsRows,
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(roles),
      db.select().from(userRoles),
      db.select().from(events),
      db.select().from(tickets),
      db.select().from(tableSeats),
      db.select().from(busSeats),
    ]);
    return {
      users: usersRows,
      roles: rolesRows,
      user_roles: userRolesRows,
      events: eventsRows,
      tickets: ticketsRows,
      table_seats: tableSeatsRows,
      bus_seats: busSeatsRows,
    };
  }

  async getHealth() {
    let dbStatus = 'disconnected';
    try {
      await this.dbService.db.execute('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
    };
  }
}
