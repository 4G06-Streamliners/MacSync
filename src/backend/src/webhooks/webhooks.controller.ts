import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import Stripe from 'stripe';

interface RequestWithRawBody {
  rawBody?: Buffer;
}

@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe | null = null;

  constructor(
    private readonly eventsService: EventsService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) this.stripe = new Stripe(key);
  }

  @Post('stripe')
  async stripeWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw body for webhook verification',
      );
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || !this.stripe) {
      throw new BadRequestException('Stripe webhook not configured');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId = session.id;
      const eventId = session.metadata?.eventId;
      const userId = session.metadata?.userId;
      const eventName = session.metadata?.eventName ?? `event #${eventId}`;

      if (!eventId || !userId) {
        console.error('Stripe webhook: missing eventId or userId in metadata');
        return { received: true };
      }

      // Retrieve payment details using PaymentsService
      const paymentData =
        await this.paymentsService.retrievePaymentDetails(session);

      const result = await this.eventsService.completeSignupFromReservation(
        sessionId,
        paymentData || undefined,
      );
      if (result.error && result.error !== 'Already signed up for this event') {
        console.error(
          'Stripe webhook: completeSignupFromReservation failed',
          result.error,
        );
      } else if (!result.error) {
        await this.notificationsService.createNotification(
          +userId,
          'confirmation',
          `You're registered for ${eventName}! Your ticket has been confirmed.`,
          +eventId,
        );
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      await this.eventsService.releaseReservation(session.id);
    }

    return { received: true };
  }
}
