import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import type { NewEvent } from '../db/schema';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @Post()
  create(@Body() event: NewEvent) {
    return this.eventsService.create(event);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() event: Partial<NewEvent>) {
    return this.eventsService.update(+id, event);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.eventsService.delete(+id);
  }

  @Post(':id/signup')
  signup(@Param('id') id: string, @Body('userId') userId: number) {
    return this.eventsService.signup(+id, userId);
  }

  @Post(':id/cancel')
  cancelSignup(@Param('id') id: string, @Body('userId') userId: number) {
    return this.eventsService.cancelSignup(+id, userId);
  }

  @Get('user/:userId/tickets')
  getUserTickets(@Param('userId') userId: string) {
    return this.eventsService.getTicketsForUser(+userId);
  }
}
