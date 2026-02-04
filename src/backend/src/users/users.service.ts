import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { users } from '../db/schema';
import type { NewUser } from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll() {
    return await this.dbService.db.select().from(users);
  }

  async findOne(id: number) {
    const result = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return result[0];
  }

  async create(user: NewUser) {
    const result = await this.dbService.db.insert(users).values(user).returning();
    return result[0];
  }

  async update(id: number, user: Partial<NewUser>) {
    const result = await this.dbService.db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number) {
    await this.dbService.db.delete(users).where(eq(users.id, id));
    return { deleted: true };
  }
}
