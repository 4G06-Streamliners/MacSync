import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RolesController } from './roles.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RolesController],
})
export class RolesModule {}

