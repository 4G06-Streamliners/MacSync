import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { runSeedDb } from '../db/seed-data';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly dbService: DatabaseService) {}

  async onModuleInit() {
    if (process.env.RUN_SEED !== 'true') return;
    try {
      const didSeed = await runSeedDb(this.dbService.db);
      if (didSeed) {
        console.log('✅ Startup seed completed (RUN_SEED=true).');
      }
    } catch (err) {
      console.error('❌ Startup seed failed:', err);
    }
  }
}
