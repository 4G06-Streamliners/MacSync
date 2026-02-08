import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import type { NewEvent } from '../db/schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('events')
@UseGuards(JwtAuthGuard)
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
  signup(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.signup(+id, req.user.sub);
  }

  @Post(':id/cancel')
  cancelSignup(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.cancelSignup(+id, req.user.sub);
  }

  @Get('user/:userId/tickets')
  getUserTickets(@Param('userId') userId: string, @Req() req: any) {
    if (req.user?.sub !== +userId) {
      throw new ForbiddenException('Access denied.');
    }
    return this.eventsService.getTicketsForUser(+userId);
  }
}
