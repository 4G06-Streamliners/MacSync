import 'reflect-metadata';

jest.mock('../../src/backend/src/payments/payments.service', () => ({
  PaymentsService: jest.fn(),
}));
jest.mock('../../src/backend/src/db/schema', () => ({}));

import { PaymentsController } from '../../src/backend/src/payments/payments.controller';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockPaymentsService: any;

  beforeEach(() => {
    mockPaymentsService = {
      refundPayment: jest.fn(),
      getPaymentsByUser: jest.fn(),
      getPaymentsByEvent: jest.fn(),
    };
    controller = new PaymentsController(mockPaymentsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('refundPayment', () => {
    it('calls service with paymentId, adminUserId, and optional partialAmount', async () => {
      mockPaymentsService.refundPayment.mockResolvedValue({ success: true });

      const result = await controller.refundPayment('10', {
        adminUserId: 1,
        partialAmount: 2000,
      });

      expect(result).toEqual({ success: true });
      expect(mockPaymentsService.refundPayment).toHaveBeenCalledWith(
        10,
        1,
        2000,
      );
    });

    it('passes undefined partialAmount when not in body', async () => {
      mockPaymentsService.refundPayment.mockResolvedValue({ success: true });

      await controller.refundPayment('5', { adminUserId: 2 });

      expect(mockPaymentsService.refundPayment).toHaveBeenCalledWith(
        5,
        2,
        undefined,
      );
    });
  });

  describe('getUserPayments', () => {
    it('returns payments for user', async () => {
      const payments = [{ id: 1, userId: 5, amountPaid: 5000 }];
      mockPaymentsService.getPaymentsByUser.mockResolvedValue(payments);

      const result = await controller.getUserPayments('5');

      expect(result).toEqual(payments);
      expect(mockPaymentsService.getPaymentsByUser).toHaveBeenCalledWith(5);
    });
  });

  describe('getEventPayments', () => {
    it('returns payments for event', async () => {
      const payments = [{ id: 1, eventId: 10, amountPaid: 5000 }];
      mockPaymentsService.getPaymentsByEvent.mockResolvedValue(payments);

      const result = await controller.getEventPayments('10');

      expect(result).toEqual(payments);
      expect(mockPaymentsService.getPaymentsByEvent).toHaveBeenCalledWith(10);
    });
  });
});
