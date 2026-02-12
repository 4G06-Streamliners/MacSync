import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EventsService } from './events.service';
import type { NewEvent } from '../db/schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

interface RequestWithUser extends Request {
  user: { sub: number; email: string };
}

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @Roles('Admin', 'Member')
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  @Roles('Admin', 'Member')
  findOne(@Param('id') id: string, @Query('userId') userId?: string) {
    const uid = userId != null && userId !== '' ? +userId : undefined;
    return this.eventsService.findOne(+id, uid);
  }

  @Post()
  @Roles('Admin')
  create(@Body() event: NewEvent) {
    return this.eventsService.create(event);
  }

  @Put(':id')
  @Roles('Admin')
  update(@Param('id') id: string, @Body() event: Partial<NewEvent>) {
    return this.eventsService.update(+id, event);
  }

  @Delete(':id')
  @Roles('Admin')
  delete(@Param('id') id: string) {
    return this.eventsService.delete(+id);
  }

  @Post(':id/signup')
  @Roles('Member', 'Admin')
  signup(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body('selectedTable') selectedTable?: number,
  ) {
    return this.eventsService.signup(+id, req.user.sub, selectedTable);
  }

  @Post(':id/checkout-session')
  @Roles('Member', 'Admin')
  createCheckoutSession(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body()
    body: {
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
      req.user.sub,
      successUrl,
      cancelUrl,
      body.selectedTable, // Guaranteed table assignment, not just a preference
    );
  }

  // Called by the client when Stripe redirects to cancel_url.
  // Releases the held seat immediately so the user can retry without waiting for expiry.
  @Post('checkout-session/:sessionId/release')
  @Roles('Member', 'Admin')
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
  @Roles('Member', 'Admin')
  cancelSignup(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.eventsService.cancelSignup(+id, req.user.sub);
  }

  @Get('user/:userId/tickets')
  @Roles('Admin', 'Member')
  async getUserTickets(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    const currentUserId = req.user.sub;
    // Allow: self-access (user fetching own tickets) OR admin
    if (currentUserId !== +userId) {
      const dbUser = await this.usersService.findOneWithRoles(currentUserId);
      const isAdmin =
        (dbUser as { isSystemAdmin?: boolean })?.isSystemAdmin ||
        (dbUser?.roles ?? []).includes('Admin');
      if (!isAdmin) {
        throw new ForbiddenException('Access denied.');
      }
    }
    return this.eventsService.getTicketsForUser(+userId);
  }
}
