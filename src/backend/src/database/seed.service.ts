import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { runSeedDb, seedPresetDemoEvents } from '../db/seed-data';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly dbService: DatabaseService) {}

  async onModuleInit() {
    if (process.env.RUN_SEED !== 'true') return;
    try {
      const didSeed = await runSeedDb(this.dbService.db);
      if (didSeed) {
        console.log('✅ Startup base seed completed (RUN_SEED=true).');
      }
      const preset = await seedPresetDemoEvents(this.dbService.db);
      if (preset.inserted > 0) {
        console.log(
          `✅ Startup: added ${preset.inserted} preset demo event(s).`,
        );
      }
    } catch (err) {
      console.error('❌ Startup seed failed:', err);
    }
  }
}
