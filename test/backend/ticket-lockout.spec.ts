import 'reflect-metadata';

jest.mock('../../src/backend/src/database/database.service', () => ({
  DatabaseService: jest.fn(),
}));
jest.mock('../../src/backend/src/payments/payments.service', () => ({
  PaymentsService: jest.fn(),
}));
jest.mock('../../src/backend/src/db/schema', () => ({
  events: { id: 'events.id', name: 'events.name', date: 'events.date' },
  tickets: { id: 'tickets.id', eventId: 'tickets.eventId', userId: 'tickets.userId' },
  tableSeats: { id: 'tableSeats.id', eventId: 'tableSeats.eventId' },
  busSeats: { id: 'busSeats.id', eventId: 'busSeats.eventId' },
  seatReservations: {
    id: 'seatReservations.id',
    eventId: 'seatReservations.eventId',
    userId: 'seatReservations.userId',
    expiresAt: 'seatReservations.expiresAt',
    stripeSessionId: 'seatReservations.stripeSessionId',
  },
}));
jest.mock('../../src/backend/src/db/seed-data', () => ({
  createTableSeatsForEvent: jest.fn(),
  createBusSeatsForEvent: jest.fn(),
}));

import { EventsService } from '../../src/backend/src/events/events.service';

function createDbChain(result: any = []) {
  const chain: any = {};
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);

  [
    'select', 'from', 'where', 'orderBy', 'limit', 'innerJoin',
    'insert', 'values', 'returning', 'update', 'set', 'delete',
  ].forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });

  return chain;
}

function createTxMock(executeResults: any[]) {
  let executeCallIndex = 0;
  const tx: any = {
    execute: jest.fn().mockImplementation(() => {
      const result = executeResults[executeCallIndex] ?? { rows: [] };
      executeCallIndex++;
      return Promise.resolve(result);
    }),
    insert: jest.fn().mockReturnValue(createDbChain()),
    select: jest.fn().mockReturnValue(createDbChain()),
    delete: jest.fn().mockReturnValue(createDbChain()),
  };
  return tx;
}

describe('Ticket Lockout – createCheckoutSession', () => {
  let service: EventsService;
  let mockDb: any;
  let mockPayments: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn(),
    };
    mockPayments = {
      createCheckoutSession: jest.fn(),
      createProductAndPrice: jest.fn(),
      recordPayment: jest.fn(),
    };
    service = new EventsService({ db: mockDb } as any, mockPayments as any);
  });

  afterEach(() => jest.clearAllMocks());

  const paidEvent = {
    id: 1,
    name: 'Fireball Formal',
    capacity: 100,
    price: 2500,
    stripePriceId: 'price_test_123',
    requiresTableSignup: true,
    requiresBusSignup: false,
    tableCount: 10,
    seatsPerTable: 10,
  };

  it('succeeds for a single user with available table seat', async () => {
    mockDb.select.mockReturnValueOnce(createDbChain([paidEvent]));
    mockDb.select.mockReturnValueOnce(createDbChain([{ count: 50 }]));
    mockDb.select.mockReturnValueOnce(createDbChain([]));
    mockDb.delete.mockReturnValue(createDbChain());

    const tx = createTxMock([{ rows: [{ id: 42 }] }]);
    mockPayments.createCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_1',
      sessionId: 'cs_session_1',
    });
    mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await service.createCheckoutSession(
      1, 10, 'http://localhost/success', 'http://localhost/cancel', 3,
    );

    expect(result.url).toBe('https://checkout.stripe.com/session_1');
    expect(result.sessionId).toBe('cs_session_1');
    expect(result.error).toBeUndefined();
    expect(tx.insert).toHaveBeenCalled();
  });

  it('returns error when no table seats available (all locked by other users)', async () => {
    mockDb.select.mockReturnValueOnce(createDbChain([paidEvent]));
    mockDb.select.mockReturnValueOnce(createDbChain([{ count: 50 }]));
    mockDb.select.mockReturnValueOnce(createDbChain([]));
    mockDb.delete.mockReturnValue(createDbChain());

    const tx = createTxMock([{ rows: [] }]);
    mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await service.createCheckoutSession(
      1, 10, 'http://localhost/success', 'http://localhost/cancel', 3,
    );

    expect(result.error).toContain('no table seats left');
    expect(result.url).toBeUndefined();
  });

  it('returns "Event is full" when overall capacity is reached', async () => {
    mockDb.select.mockReturnValueOnce(createDbChain([paidEvent]));
    mockDb.select.mockReturnValueOnce(createDbChain([{ count: 100 }]));

    const result = await service.createCheckoutSession(
      1, 10, 'http://localhost/success', 'http://localhost/cancel',
    );

    expect(result.error).toBe('Event is full');
  });
});

describe('Ticket Lockout – releaseReservation', () => {
  let service: EventsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new EventsService({ db: mockDb } as any, {} as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('deletes reservation by Stripe session ID', async () => {
    mockDb.delete.mockReturnValue(createDbChain());
    await service.releaseReservation('cs_session_to_release');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('Ticket Lockout – completeSignupFromReservation', () => {
  let service: EventsService;
  let mockDb: any;
  let mockPayments: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockPayments = { recordPayment: jest.fn() };
    service = new EventsService({ db: mockDb } as any, mockPayments as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('creates ticket, assigns seat, records payment, and deletes reservation', async () => {
    const reservation = {
      id: 5,
      stripeSessionId: 'cs_paid',
      eventId: 1,
      userId: 10,
      tableSeatId: 42,
      busSeatId: null,
    };
    mockDb.select.mockReturnValueOnce(createDbChain([reservation]));
    mockDb.select.mockReturnValueOnce(createDbChain([]));
    mockDb.insert.mockReturnValue(createDbChain([{ id: 100 }]));
    mockDb.update.mockReturnValue(createDbChain());
    mockDb.select.mockReturnValueOnce(createDbChain([{ id: 42, tableNumber: 3, seatNumber: 1 }]));
    mockDb.delete.mockReturnValue(createDbChain());

    const result = await service.completeSignupFromReservation('cs_paid', {
      paymentIntentId: 'pi_test',
      chargeId: 'ch_test',
      amountPaid: 2500,
      currency: 'usd',
    });

    expect(result.ticket).toBeDefined();
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockPayments.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        eventId: 1,
        ticketId: 100,
        stripeSessionId: 'cs_paid',
      }),
    );
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('Ticket Lockout – Concurrent Access Simulation', () => {
  let service: EventsService;
  let mockDb: any;
  let mockPayments: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn(),
    };
    mockPayments = { createCheckoutSession: jest.fn() };
    service = new EventsService({ db: mockDb } as any, mockPayments as any);
  });

  afterEach(() => jest.clearAllMocks());

  const paidEventOneSeat = {
    id: 1,
    name: 'Last Seat Event',
    capacity: 100,
    price: 2500,
    stripePriceId: 'price_last',
    requiresTableSignup: true,
    requiresBusSignup: false,
    tableCount: 1,
    seatsPerTable: 1,
  };

  it('when two users race for the last seat, one succeeds and one gets "full" error', async () => {
    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) return createDbChain([paidEventOneSeat]);
      if (callCount <= 4) return createDbChain([{ count: 99 }]);
      return createDbChain([]);
    });
    mockDb.delete.mockReturnValue(createDbChain());

    const txA = createTxMock([{ rows: [{ id: 1 }] }]);
    const txB = createTxMock([{ rows: [] }]);

    let txCallCount = 0;
    mockDb.transaction.mockImplementation(async (fn: any) => {
      txCallCount++;
      if (txCallCount === 1) return fn(txA);
      return fn(txB);
    });

    mockPayments.createCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_winner',
      sessionId: 'cs_winner',
    });

    const [resultA, resultB] = await Promise.all([
      service.createCheckoutSession(1, 10, 'http://s', 'http://c', 1),
      service.createCheckoutSession(1, 20, 'http://s', 'http://c', 1),
    ]);

    const results = [resultA, resultB];
    const successes = results.filter((r) => r.url && !r.error);
    const failures = results.filter((r) => r.error);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(successes[0].sessionId).toBe('cs_winner');
    expect(failures[0].error).toContain('no table seats left');
  });
});
