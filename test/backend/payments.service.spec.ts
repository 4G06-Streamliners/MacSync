import 'reflect-metadata';

jest.mock('../../src/backend/src/database/database.service', () => ({
  DatabaseService: jest.fn(),
}));
jest.mock('../../src/backend/src/db/schema', () => ({
  payments: {
    id: 'payments.id',
    userId: 'payments.userId',
    eventId: 'payments.eventId',
    ticketId: 'payments.ticketId',
    stripeSessionId: 'payments.stripeSessionId',
    stripePaymentIntentId: 'payments.stripePaymentIntentId',
    stripeChargeId: 'payments.stripeChargeId',
    amountPaid: 'payments.amountPaid',
    currency: 'payments.currency',
    status: 'payments.status',
    refundedAmount: 'payments.refundedAmount',
    paymentDate: 'payments.paymentDate',
  },
  users: { id: 'users.id', isSystemAdmin: 'users.isSystemAdmin' },
}));

import { PaymentsService } from '../../src/backend/src/payments/payments.service';

const MockStripe = require('stripe');
const mockRefundsCreate = MockStripe.mockRefundsCreate;

function createDbChain(result: any = []) {
  const chain: any = {};
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
  [
    'select',
    'from',
    'where',
    'orderBy',
    'limit',
    'insert',
    'values',
    'update',
    'set',
  ].forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });
  return chain;
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockDb: any;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.STRIPE_SECRET_KEY;

    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };
    service = new PaymentsService({ db: mockDb } as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createProductAndPrice', () => {
    it('returns error when Stripe is not configured', async () => {
      const result = await service.createProductAndPrice('Event', 1, 5000);
      expect(result).toEqual({
        error:
          'Payment is not configured. Set STRIPE_SECRET_KEY in the server environment.',
      });
    });

    it('returns error when price is zero or negative', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_x';
      const serviceWithStripe = new PaymentsService({ db: mockDb } as any);

      expect(await serviceWithStripe.createProductAndPrice('E', 1, 0)).toEqual({
        error: 'Price must be greater than 0',
      });
      expect(await serviceWithStripe.createProductAndPrice('E', 1, -100)).toEqual({
        error: 'Price must be greater than 0',
      });
    });
  });

  describe('createCheckoutSession', () => {
    it('returns error when Stripe is not configured', async () => {
      const result = await service.createCheckoutSession({
        eventId: 1,
        userId: 5,
        amount: 5000,
        eventName: 'Gala',
        successUrl: 'https://a.com/success',
        cancelUrl: 'https://a.com/cancel',
      });
      expect(result).toEqual({
        error:
          'Payment is not configured. Set STRIPE_SECRET_KEY in the server environment.',
      });
    });
  });

  describe('retrievePaymentDetails', () => {
    it('returns null when session has no payment_intent', async () => {
      const session = { payment_intent: null, amount_total: 5000, currency: 'usd' };
      const result = await service.retrievePaymentDetails(session as any);
      expect(result).toBeNull();
    });
  });

  describe('recordPayment', () => {
    it('inserts payment with correct fields', async () => {
      const chain = createDbChain();
      mockDb.insert.mockReturnValue(chain);

      await service.recordPayment({
        userId: 5,
        eventId: 10,
        ticketId: 1,
        stripeSessionId: 'cs_123',
        paymentIntentId: 'pi_123',
        chargeId: 'ch_123',
        amountPaid: 5000,
        currency: 'usd',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 5,
          eventId: 10,
          ticketId: 1,
          stripeSessionId: 'cs_123',
          stripePaymentIntentId: 'pi_123',
          stripeChargeId: 'ch_123',
          amountPaid: 5000,
          currency: 'usd',
          status: 'succeeded',
        }),
      );
    });
  });

  describe('refundPayment', () => {
    it('returns error when user is not admin', async () => {
      mockDb.select.mockReturnValue(createDbChain([]));

      const result = await service.refundPayment(1, 99);

      expect(result).toEqual({ error: 'Unauthorized: Admin access required' });
    });

    it('returns error when user is not system admin', async () => {
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 99, isSystemAdmin: false }]));

      const result = await service.refundPayment(1, 99);

      expect(result).toEqual({ error: 'Unauthorized: Admin access required' });
    });

    it('returns error when payment not found', async () => {
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, isSystemAdmin: true }]))
        .mockReturnValueOnce(createDbChain([]));

      const result = await service.refundPayment(999, 1);

      expect(result).toEqual({ error: 'Payment not found' });
    });

    it('returns error when payment already fully refunded', async () => {
      const payment = {
        id: 1,
        status: 'refunded',
        stripePaymentIntentId: 'pi_1',
        amountPaid: 5000,
        refundedAmount: 5000,
      };
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, isSystemAdmin: true }]))
        .mockReturnValueOnce(createDbChain([payment]));

      const result = await service.refundPayment(1, 1);

      expect(result).toEqual({ error: 'Payment already fully refunded' });
    });

    it('returns error when no Stripe charge or payment intent on payment', async () => {
      const payment = {
        id: 1,
        status: 'succeeded',
        stripePaymentIntentId: null,
        stripeChargeId: null,
        amountPaid: 5000,
        refundedAmount: 0,
      };
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, isSystemAdmin: true }]))
        .mockReturnValueOnce(createDbChain([payment]));

      const result = await service.refundPayment(1, 1);

      expect(result).toEqual({
        error: 'No Stripe charge or payment intent found for this payment',
      });
    });

    it('returns error when Stripe is not configured', async () => {
      const payment = {
        id: 1,
        status: 'succeeded',
        stripePaymentIntentId: 'pi_1',
        stripeChargeId: 'ch_1',
        amountPaid: 5000,
        refundedAmount: 0,
      };
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, isSystemAdmin: true }]))
        .mockReturnValueOnce(createDbChain([payment]));

      const result = await service.refundPayment(1, 1);

      expect(result).toEqual({ error: 'Stripe not configured' });
    });

    it('returns error when no amount left to refund', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_x';
      const serviceWithStripe = new PaymentsService({ db: mockDb } as any);
      const payment = {
        id: 1,
        status: 'succeeded',
        stripePaymentIntentId: 'pi_1',
        stripeChargeId: 'ch_1',
        amountPaid: 5000,
        refundedAmount: 5000,
      };
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, isSystemAdmin: true }]))
        .mockReturnValueOnce(createDbChain([payment]));

      const result = await serviceWithStripe.refundPayment(1, 1);

      expect(result).toEqual({ error: 'No amount left to refund' });
    });

    it('issues full refund and updates payment when Stripe succeeds', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_x';
      const serviceWithStripe = new PaymentsService({ db: mockDb } as any);

      const payment = {
        id: 1,
        status: 'succeeded',
        stripePaymentIntentId: 'pi_1',
        stripeChargeId: 'ch_1',
        amountPaid: 5000,
        refundedAmount: 0,
      };
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, isSystemAdmin: true }]))
        .mockReturnValueOnce(createDbChain([payment]));
      mockDb.update.mockReturnValue(createDbChain());

      const result = await serviceWithStripe.refundPayment(1, 1);

      expect(result).toEqual({ success: true });
      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_1',
        amount: 5000,
      });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns error when Stripe refund status is not succeeded', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_x';
      const serviceWithStripe = new PaymentsService({ db: mockDb } as any);
      mockRefundsCreate.mockResolvedValueOnce({ status: 'failed' });

      const payment = {
        id: 1,
        status: 'succeeded',
        stripePaymentIntentId: 'pi_1',
        stripeChargeId: 'ch_1',
        amountPaid: 5000,
        refundedAmount: 0,
      };
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, isSystemAdmin: true }]))
        .mockReturnValueOnce(createDbChain([payment]));

      const result = await serviceWithStripe.refundPayment(1, 1);

      expect(result).toEqual({ error: 'Refund failed: failed' });
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns error when Stripe refund throws', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_x';
      const serviceWithStripe = new PaymentsService({ db: mockDb } as any);
      mockRefundsCreate.mockRejectedValueOnce(new Error('Stripe API error'));

      const payment = {
        id: 1,
        status: 'succeeded',
        stripePaymentIntentId: 'pi_1',
        stripeChargeId: 'ch_1',
        amountPaid: 5000,
        refundedAmount: 0,
      };
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, isSystemAdmin: true }]))
        .mockReturnValueOnce(createDbChain([payment]));

      const result = await serviceWithStripe.refundPayment(1, 1);

      expect(result).toEqual({ error: 'Stripe API error' });
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentsByUser', () => {
    it('returns payments from database', async () => {
      const paymentsList = [{ id: 1, userId: 5, amountPaid: 5000 }];
      mockDb.select.mockReturnValue(createDbChain(paymentsList));

      const result = await service.getPaymentsByUser(5);

      expect(result).toEqual(paymentsList);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getPaymentsByEvent', () => {
    it('returns payments from database', async () => {
      const paymentsList = [{ id: 1, eventId: 10, amountPaid: 5000 }];
      mockDb.select.mockReturnValue(createDbChain(paymentsList));

      const result = await service.getPaymentsByEvent(10);

      expect(result).toEqual(paymentsList);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
