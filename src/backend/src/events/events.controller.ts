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
  findOne(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const uid = userId != null && userId !== '' ? +userId : undefined;
    return this.eventsService.findOne(+id, uid);
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
  signup(
    @Param('id') id: string,
    @Body('userId') userId: number,
    @Body('selectedTable') selectedTable?: number,
  ) {
    return this.eventsService.signup(+id, userId, selectedTable);
  }

  @Post(':id/checkout-session')
  createCheckoutSession(
    @Param('id') id: string,
    @Body()
    body: {
      userId: number;
      successUrl?: string;
      cancelUrl?: string;
      selectedTable?: number;
    },
  ) {
    // Accept http(s) and deep-link schemes (e.g. exp:// for Expo Go) so mobile redirects open the app
    const isValidRedirectUrl = (s: string) =>
      typeof s === 'string' &&
      s.length > 0 &&
      (s.startsWith('http://') ||
        s.startsWith('https://') ||
        s.startsWith('exp://') ||
        s.startsWith('expo://'));
    const successUrl =
      (body.successUrl?.trim() && isValidRedirectUrl(body.successUrl.trim())
        ? body.successUrl.trim()
        : null) ||
      process.env.STRIPE_SUCCESS_URL ||
      'http://localhost:8081/payment-success';
    const cancelUrl =
      (body.cancelUrl?.trim() && isValidRedirectUrl(body.cancelUrl.trim())
        ? body.cancelUrl.trim()
        : null) ||
      process.env.STRIPE_CANCEL_URL ||
      'http://localhost:8081/payment-cancel';
    return this.eventsService.createCheckoutSession(
      +id,
      body.userId,
      successUrl,
      cancelUrl,
      body.selectedTable, // Guaranteed table assignment, not just a preference
    );
  }

  // Called by the client when Stripe redirects to cancel_url.
  // Releases the held seat immediately so the user can retry without waiting for expiry.
  @Post('checkout-session/:sessionId/release')
  async releaseCheckoutReservation(@Param('sessionId') sessionId: string) {
    console.log(
      '[releaseCheckoutReservation] Releasing reservation for session:',
      sessionId,
    );
    await this.eventsService.releaseReservation(sessionId);
    console.log('[releaseCheckoutReservation] Released successfully');
    return { released: true };
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
