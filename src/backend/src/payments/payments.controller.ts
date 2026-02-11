import { Controller, Post, Param, Body, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':paymentId/refund')
  refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: { adminUserId: number; partialAmount?: number },
  ) {
    return this.paymentsService.refundPayment(
      +paymentId,
      body.adminUserId,
      body.partialAmount,
    );
  }

  @Get('user/:userId')
  getUserPayments(@Param('userId') userId: string) {
    return this.paymentsService.getPaymentsByUser(+userId);
  }

  @Get('event/:eventId')
  getEventPayments(@Param('eventId') eventId: string) {
    return this.paymentsService.getPaymentsByEvent(+eventId);
  }
}
