import 'reflect-metadata';

jest.mock('../../src/backend/src/database/database.service', () => ({
  DatabaseService: jest.fn(),
}));
jest.mock('../../src/backend/src/payments/payments.service', () => ({
  PaymentsService: jest.fn(),
}));
jest.mock('../../src/backend/src/db/schema', () => ({
  refundRequests: {
    id: 'refundRequests.id',
    ticketId: 'refundRequests.ticketId',
    userId: 'refundRequests.userId',
    status: 'refundRequests.status',
    createdAt: 'refundRequests.createdAt',
  },
  users: { id: 'users.id', isSystemAdmin: 'users.isSystemAdmin' },
  tickets: { id: 'tickets.id' },
  events: { id: 'events.id', name: 'events.name' },
  payments: { id: 'payments.id', ticketId: 'payments.ticketId' },
}));

import { RefundRequestsService } from '../../src/backend/src/refund-requests/refund-requests.service';

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
    'innerJoin',
    'leftJoin',
    'insert',
    'values',
    'returning',
    'update',
    'set',
    'delete',
  ].forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });

  return chain;
}

describe('RefundRequestsService', () => {
  let service: RefundRequestsService;
  let mockDb: any;
  let mockPaymentsService: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockPaymentsService = {
      refundPayment: jest.fn(),
    };
    service = new RefundRequestsService(
      { db: mockDb } as any,
      mockPaymentsService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('createRefundRequest', () => {
    it('creates refund request for valid ticket owned by user', async () => {
      const ticket = { id: 1, userId: 5, eventId: 10, price: 5000 };
      const payment = { id: 100 };

      mockDb.select
        .mockReturnValueOnce(createDbChain([ticket])) // ticket check
        .mockReturnValueOnce(createDbChain([])) // no pending request
        .mockReturnValueOnce(createDbChain([payment])); // payment exists

      mockDb.insert.mockReturnValue(
        createDbChain([{ id: 1, status: 'pending' }]),
      );

      const result = await service.createRefundRequest(5, 1, 'Event cancelled');
      expect(result).toEqual({ success: true, requestId: 1 });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('returns error if ticket not found', async () => {
      mockDb.select.mockReturnValue(createDbChain([]));
      const result = await service.createRefundRequest(5, 999, 'No ticket');
      expect(result).toEqual({ error: 'Ticket not found or does not belong to you' });
    });

    it('returns error if ticket not owned by user', async () => {
      // First query checks tickets.id AND tickets.userId - should return empty if userId doesn't match
      mockDb.select.mockReturnValueOnce(createDbChain([]));
      
      const result = await service.createRefundRequest(5, 1, 'Wrong user');
      expect(result).toEqual({ error: 'Ticket not found or does not belong to you' });
    });

    it('returns error if pending refund request already exists', async () => {
      mockDb.select
        .mockReturnValueOnce(
          createDbChain([{ id: 1, userId: 5, eventId: 10 }]),
        )
        .mockReturnValueOnce(createDbChain([{ id: 1, status: 'pending' }]));

      const result = await service.createRefundRequest(5, 1, 'Duplicate');
      expect(result).toEqual({
        error: 'A refund request is already pending for this ticket',
      });
    });

    it('handles free events (no payment)', async () => {
      const freeTicket = { id: 1, userId: 5, eventId: 10, price: 0 };
      mockDb.select
        .mockReturnValueOnce(createDbChain([freeTicket]))
        .mockReturnValueOnce(createDbChain([]))
        .mockReturnValueOnce(createDbChain([])); // no payment

      mockDb.insert.mockReturnValue(
        createDbChain([{ id: 2, status: 'pending' }]),
      );

      const result = await service.createRefundRequest(5, 1, 'Free event');
      expect(result).toEqual({ success: true, requestId: 2 });
    });
  });

  describe('getAllRefundRequests', () => {
    it('returns all refund requests for admin user', async () => {
      const adminUser = { id: 1, isSystemAdmin: true };
      const requests = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'approved' },
      ];

      mockDb.select
        .mockReturnValueOnce(createDbChain([adminUser]))
        .mockReturnValueOnce(createDbChain(requests));

      const result = await service.getAllRefundRequests(1);
      expect(result).toEqual(requests);
    });

    it('throws error for non-admin user', async () => {
      mockDb.select.mockReturnValue(
        createDbChain([{ id: 2, isSystemAdmin: false }]),
      );

      await expect(service.getAllRefundRequests(2)).rejects.toThrow(
        'Admin access required',
      );
    });
  });

  describe('approveRefundRequest', () => {
    it('approves refund, processes payment, and deletes ticket', async () => {
      const admin = { id: 1, isSystemAdmin: true };
      const request = {
        id: 10,
        ticketId: 5,
        paymentId: 100,
        status: 'pending',
      };

      mockDb.select
        .mockReturnValueOnce(createDbChain([admin]))
        .mockReturnValueOnce(createDbChain([request]));

      mockPaymentsService.refundPayment.mockResolvedValue({ success: true });
      mockDb.update.mockReturnValue(createDbChain());
      mockDb.delete.mockReturnValue(createDbChain());

      const result = await service.approveRefundRequest(
        10,
        1,
        'Approved by admin',
      );

      expect(result).toEqual({ success: true });
      expect(mockPaymentsService.refundPayment).toHaveBeenCalledWith(100, 1);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('returns error if request already processed', async () => {
      mockDb.select
        .mockReturnValueOnce(
          createDbChain([{ id: 1, isSystemAdmin: true }]),
        )
        .mockReturnValueOnce(
          createDbChain([{ id: 10, status: 'approved' }]),
        );

      const result = await service.approveRefundRequest(10, 1);
      expect(result).toEqual({
        error: 'Refund request has already been processed',
      });
    });

    it('returns error if Stripe refund fails', async () => {
      mockDb.select
        .mockReturnValueOnce(
          createDbChain([{ id: 1, isSystemAdmin: true }]),
        )
        .mockReturnValueOnce(
          createDbChain([
            { id: 10, ticketId: 5, paymentId: 100, status: 'pending' },
          ]),
        );

      mockPaymentsService.refundPayment.mockResolvedValue({
        error: 'Refund failed',
      });

      const result = await service.approveRefundRequest(10, 1);
      expect(result).toEqual({ error: 'Refund failed: Refund failed' });
    });

    it('handles free event refund (no payment)', async () => {
      mockDb.select
        .mockReturnValueOnce(
          createDbChain([{ id: 1, isSystemAdmin: true }]),
        )
        .mockReturnValueOnce(
          createDbChain([
            { id: 10, ticketId: 5, paymentId: null, status: 'pending' },
          ]),
        );

      mockDb.update.mockReturnValue(createDbChain());
      mockDb.delete.mockReturnValue(createDbChain());

      const result = await service.approveRefundRequest(10, 1);
      expect(result).toEqual({ success: true });
      expect(mockPaymentsService.refundPayment).not.toHaveBeenCalled();
    });
  });

  describe('denyRefundRequest', () => {
    it('denies refund request with admin response', async () => {
      mockDb.select
        .mockReturnValueOnce(
          createDbChain([{ id: 1, isSystemAdmin: true }]),
        )
        .mockReturnValueOnce(
          createDbChain([{ id: 10, status: 'pending' }]),
        );

      mockDb.update.mockReturnValue(createDbChain());

      const result = await service.denyRefundRequest(
        10,
        1,
        'Cannot refund after event date',
      );

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns error if not admin', async () => {
      mockDb.select.mockReturnValue(
        createDbChain([{ id: 2, isSystemAdmin: false }]),
      );

      const result = await service.denyRefundRequest(10, 2, 'Denied');
      expect(result).toEqual({ error: 'Admin access required' });
    });

    it('returns error if request already processed', async () => {
      mockDb.select
        .mockReturnValueOnce(
          createDbChain([{ id: 1, isSystemAdmin: true }]),
        )
        .mockReturnValueOnce(
          createDbChain([{ id: 10, status: 'denied' }]),
        );

      const result = await service.denyRefundRequest(10, 1, 'Already done');
      expect(result).toEqual({
        error: 'Refund request has already been processed',
      });
    });
  });

  describe('getUserRefundRequests', () => {
    it('returns refund requests for specific user', async () => {
      const userRequests = [
        { id: 1, userId: 5, status: 'pending' },
        { id: 2, userId: 5, status: 'approved' },
      ];

      mockDb.select.mockReturnValue(createDbChain(userRequests));

      const result = await service.getUserRefundRequests(5);
      expect(result).toEqual(userRequests);
    });
  });
});
