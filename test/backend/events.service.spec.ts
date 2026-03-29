import 'reflect-metadata';

jest.mock('../../src/backend/src/database/database.service', () => ({
  DatabaseService: jest.fn(),
}));
jest.mock('../../src/backend/src/payments/payments.service', () => ({
  PaymentsService: jest.fn(),
}));
jest.mock('../../src/backend/src/db/schema', () => ({
  events: { id: 'events.id', name: 'events.name', date: 'events.date', price: 'events.price', imageUrl: 'events.imageUrl' },
  tickets: { id: 'tickets.id', eventId: 'tickets.eventId', userId: 'tickets.userId', checkedIn: 'tickets.checkedIn', busSeat: 'tickets.busSeat', tableSeat: 'tickets.tableSeat', qrCodeData: 'tickets.qrCodeData', createdAt: 'tickets.createdAt' },
  users: { id: 'users.id', name: 'users.name', email: 'users.email' },
  tableSeats: { id: 'tableSeats.id', eventId: 'tableSeats.eventId' },
  busSeats: { id: 'busSeats.id', eventId: 'busSeats.eventId' },
  seatReservations: { id: 'seatReservations.id' },
  refundRequests: { id: 'refundRequests.id', ticketId: 'refundRequests.ticketId', userId: 'refundRequests.userId', status: 'refundRequests.status', adminResponse: 'refundRequests.adminResponse', createdAt: 'refundRequests.createdAt' },
  payments: { id: 'payments.id', ticketId: 'payments.ticketId' },
}));

const mockCreateTableSeats = jest.fn();
const mockCreateBusSeats = jest.fn();
jest.mock('../../src/backend/src/db/seed-data', () => ({
  createTableSeatsForEvent: mockCreateTableSeats,
  createBusSeatsForEvent: mockCreateBusSeats,
}));

import { EventsService } from '../../src/backend/src/events/events.service';
import { createDbChain } from './helpers/db-chain';

describe('EventsService', () => {
  let service: EventsService;
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
      createCheckoutSession: jest.fn(),
      recordPayment: jest.fn(),
    };
    service = new EventsService({ db: mockDb } as any, mockPaymentsService, { createNotification: jest.fn() } as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll returns events from database', async () => {
    const events = [{ id: 1, registeredCount: 10 }];
    mockDb.select.mockReturnValue(createDbChain(events));
    expect(await service.findAll()).toEqual(events);
  });

  it('findOne returns event with userTicket null, or null if not found', async () => {
    mockDb.select.mockReturnValue(createDbChain([{ id: 1, name: 'E' }]));
    expect(await service.findOne(1)).toEqual({ id: 1, name: 'E', userTicket: null });

    mockDb.select.mockReturnValue(createDbChain([]));
    expect(await service.findOne(999)).toBeNull();
  });

  it('findOne includes userTicket when userId provided', async () => {
    const ticket = { tableSeat: 'T1S3', busSeat: null };
    mockDb.select
      .mockReturnValueOnce(createDbChain([{ id: 1 }]))
      .mockReturnValueOnce(createDbChain([ticket]));

    expect(await service.findOne(1, 5)).toEqual({ id: 1, userTicket: ticket });
  });

  it('create inserts event and auto-creates table/bus seats when required', async () => {
    const created = {
      id: 1, requiresTableSignup: true, tableCount: 5, seatsPerTable: 8,
      requiresBusSignup: true, busCount: 2, busCapacity: 50,
    };
    mockDb.insert.mockReturnValue(createDbChain([created]));

    await service.create({
      name: 'Event', date: '2026-06-15', capacity: 100, price: 0,
      requiresTableSignup: true, tableCount: 5, seatsPerTable: 8,
      requiresBusSignup: true, busCount: 2, busCapacity: 50,
    } as any);

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockCreateTableSeats).toHaveBeenCalledWith(mockDb, 1, 5, 8);
    expect(mockCreateBusSeats).toHaveBeenCalledWith(mockDb, 1, 2, 50);
  });

  it('create skips seat creation when not required', async () => {
    const created = {
      id: 2, requiresTableSignup: false, requiresBusSignup: false,
      tableCount: null, seatsPerTable: null, busCount: null, busCapacity: null,
    };
    mockDb.insert.mockReturnValue(createDbChain([created]));

    await service.create({ name: 'Simple', date: '2026-06-15', capacity: 50, price: 0 } as any);

    expect(mockCreateTableSeats).not.toHaveBeenCalled();
    expect(mockCreateBusSeats).not.toHaveBeenCalled();
  });

  it('update and delete delegate to database', async () => {
    mockDb.update.mockReturnValue(createDbChain([{ id: 1, name: 'Updated' }]));
    expect(await service.update(1, { name: 'Updated' } as any)).toEqual({ id: 1, name: 'Updated' });

    mockDb.delete.mockReturnValue(createDbChain());
    expect(await service.delete(1)).toEqual({ deleted: true });
  });

  it('signup assigns table seat when selectedTable is provided', async () => {
    // No existing ticket
    mockDb.select
      .mockReturnValueOnce(createDbChain([]))                                          // existing ticket check
      .mockReturnValueOnce(createDbChain([{ id: 1, requiresTableSignup: true, requiresBusSignup: false, capacity: 100 }])) // event
      .mockReturnValueOnce(createDbChain([{ count: 0 }]))                             // ticket count
      .mockReturnValueOnce(createDbChain([{ id: 42 }]))                               // table seat available
      .mockReturnValueOnce(createDbChain([{ id: 42, tableNumber: 2, seatNumber: 1 }])); // seat to assign
    mockDb.insert.mockReturnValue(createDbChain([{ id: 99, userId: 5, eventId: 1 }]));
    mockDb.update.mockReturnValue(createDbChain());

    const result = await service.signup(1, 5, 2);

    expect(result.error).toBeUndefined();
    expect(result.ticket).toMatchObject({ tableSeat: 'Table 2, Seat 1' });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('cancelSignup returns error when not signed up, cancels when signed up', async () => {
    mockDb.select.mockReturnValue(createDbChain([]));
    expect(await service.cancelSignup(1, 5)).toEqual({ error: 'Not signed up for this event' });

    mockDb.select.mockReturnValue(createDbChain([{ id: 10, userId: 5, eventId: 1 }]));
    mockDb.update.mockReturnValueOnce(createDbChain()).mockReturnValueOnce(createDbChain());
    mockDb.delete.mockReturnValue(createDbChain());
    expect(await service.cancelSignup(1, 5)).toEqual({ cancelled: true });
  });

  it('getTicketsForUser returns tickets from database', async () => {
    const tickets = [{ ticketId: 1, eventName: 'Gala' }];
    mockDb.select.mockReturnValue(createDbChain(tickets));
    const result = await service.getTicketsForUser(5);
    // Service maps rows and adds refundRequest field; check the stable fields
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ ticketId: 1, eventName: 'Gala' });
    expect(result[0]).toHaveProperty('refundRequest');
  });

  it('releaseReservation deletes by session id', async () => {
    mockDb.delete.mockReturnValue(createDbChain());
    await service.releaseReservation('cs_test_123');
    expect(mockDb.delete).toHaveBeenCalled();
  });

  describe('createCheckoutSession (payment flow)', () => {
    it('returns error when event not found', async () => {
      mockDb.select.mockReturnValue(createDbChain([]));

      const result = await service.createCheckoutSession(
        999,
        1,
        'https://app/success',
        'https://app/cancel',
      );

      expect(result).toEqual({ error: 'Event not found' });
      expect(mockPaymentsService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('returns error when event has price but no Stripe price configured', async () => {
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, name: 'Gala', price: 5000, stripePriceId: null, capacity: 100, requiresTableSignup: false }]))
        .mockReturnValueOnce(createDbChain([{ count: 0 }]))
        .mockReturnValueOnce(createDbChain([]));

      const result = await service.createCheckoutSession(
        1,
        1,
        'https://app/success',
        'https://app/cancel',
      );

      expect(result).toEqual({
        error: 'This event requires payment but has no Stripe price configured.',
      });
      expect(mockPaymentsService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('returns error when event is full', async () => {
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, name: 'Gala', price: 5000, stripePriceId: 'price_1', capacity: 10, requiresTableSignup: false }]))
        .mockReturnValueOnce(createDbChain([{ count: 10 }]));

      const result = await service.createCheckoutSession(
        1,
        1,
        'https://app/success',
        'https://app/cancel',
      );

      expect(result).toEqual({ error: 'Event is full' });
      expect(mockPaymentsService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('returns error when user already signed up', async () => {
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, name: 'Gala', price: 5000, stripePriceId: 'price_1', capacity: 10, requiresTableSignup: false }]))
        .mockReturnValueOnce(createDbChain([{ count: 5 }]))
        .mockReturnValueOnce(createDbChain([{ id: 1, userId: 1, eventId: 1 }]));

      const result = await service.createCheckoutSession(
        1,
        1,
        'https://app/success',
        'https://app/cancel',
      );

      expect(result).toEqual({ error: 'Already signed up for this event' });
      expect(mockPaymentsService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('calls paymentsService.createCheckoutSession and inserts reservation on success', async () => {
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, name: 'Gala', price: 5000, stripePriceId: 'price_1', capacity: 10, requiresTableSignup: false }]))
        .mockReturnValueOnce(createDbChain([{ count: 5 }]))
        .mockReturnValueOnce(createDbChain([]));
      mockDb.delete.mockReturnValue(createDbChain());
      mockPaymentsService.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/session',
        sessionId: 'cs_test_123',
      });
      const tx = {
        insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue(createDbChain()) }),
      };
      mockDb.transaction = jest.fn().mockImplementation((cb: (tx: any) => Promise<any>) =>
        cb(tx),
      );

      const result = await service.createCheckoutSession(
        1,
        5,
        'https://app/success',
        'https://app/cancel',
      );

      expect(result).toEqual({ url: 'https://checkout.stripe.com/session', sessionId: 'cs_test_123' });
      expect(mockPaymentsService.createCheckoutSession).toHaveBeenCalledWith({
        eventId: 1,
        userId: 5,
        amount: 5000,
        currency: 'usd',
        eventName: 'Gala',
        successUrl: 'https://app/success',
        cancelUrl: 'https://app/cancel',
      });
      expect(tx.insert).toHaveBeenCalled();
    });

    it('returns error when paymentsService.createCheckoutSession returns error', async () => {
      mockDb.select
        .mockReturnValueOnce(createDbChain([{ id: 1, name: 'Gala', price: 5000, stripePriceId: 'price_1', capacity: 10, requiresTableSignup: false }]))
        .mockReturnValueOnce(createDbChain([{ count: 5 }]))
        .mockReturnValueOnce(createDbChain([]));
      mockDb.delete.mockReturnValue(createDbChain());
      mockPaymentsService.createCheckoutSession.mockResolvedValue({
        error: 'Payment service is not configured.',
      });
      const tx = {
        insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue(createDbChain()) }),
      };
      mockDb.transaction = jest.fn().mockImplementation((cb: (tx: any) => Promise<any>) =>
        cb(tx),
      );

      const result = await service.createCheckoutSession(
        1,
        5,
        'https://app/success',
        'https://app/cancel',
      );

      expect(result).toEqual({ error: 'Payment service is not configured.' });
      expect(tx.insert).not.toHaveBeenCalled();
    });
  });

  describe('completeSignupFromReservation (payment flow)', () => {
    it('returns error when reservation not found', async () => {
      mockDb.select.mockReturnValue(createDbChain([]));

      const result = await service.completeSignupFromReservation('cs_unknown');

      expect(result).toEqual({ error: 'Reservation not found or already used' });
      expect(mockPaymentsService.recordPayment).not.toHaveBeenCalled();
    });

    it('returns error when user already has ticket for event', async () => {
      const reservation = { id: 1, stripeSessionId: 'cs_123', eventId: 10, userId: 5, tableSeatId: null, busSeatId: null };
      mockDb.select
        .mockReturnValueOnce(createDbChain([reservation]))
        .mockReturnValueOnce(createDbChain([{ id: 1, userId: 5, eventId: 10 }]));
      mockDb.delete.mockReturnValue(createDbChain());

      const result = await service.completeSignupFromReservation('cs_123');

      expect(result).toEqual({ error: 'Already signed up for this event', ticket: { id: 1, userId: 5, eventId: 10 } });
      expect(mockPaymentsService.recordPayment).not.toHaveBeenCalled();
    });

    it('creates ticket and calls recordPayment when paymentData provided', async () => {
      const reservation = { id: 1, stripeSessionId: 'cs_123', eventId: 10, userId: 5, tableSeatId: null, busSeatId: null };
      const newTicket = { id: 99, userId: 5, eventId: 10, qrCodeData: null, tableSeat: null, busSeat: null };
      mockDb.select
        .mockReturnValueOnce(createDbChain([reservation]))
        .mockReturnValueOnce(createDbChain([]));
      mockDb.insert.mockReturnValue(createDbChain([newTicket]));
      mockDb.update.mockReturnValue(createDbChain());
      mockDb.delete.mockReturnValue(createDbChain());

      const result = await service.completeSignupFromReservation('cs_123', {
        paymentIntentId: 'pi_1',
        chargeId: 'ch_1',
        amountPaid: 5000,
        currency: 'usd',
      });

      expect(result.error).toBeUndefined();
      expect(result.ticket).toMatchObject({ id: 99, userId: 5, eventId: 10 });
      expect(mockPaymentsService.recordPayment).toHaveBeenCalledWith({
        userId: 5,
        eventId: 10,
        ticketId: 99,
        stripeSessionId: 'cs_123',
        paymentIntentId: 'pi_1',
        chargeId: 'ch_1',
        amountPaid: 5000,
        currency: 'usd',
      });
    });

    it('does not call recordPayment when paymentData omitted', async () => {
      const reservation = { id: 1, stripeSessionId: 'cs_123', eventId: 10, userId: 5, tableSeatId: null, busSeatId: null };
      const newTicket = { id: 99, userId: 5, eventId: 10, qrCodeData: null, tableSeat: null, busSeat: null };
      mockDb.select
        .mockReturnValueOnce(createDbChain([reservation]))
        .mockReturnValueOnce(createDbChain([]));
      mockDb.insert.mockReturnValue(createDbChain([newTicket]));
      mockDb.update.mockReturnValue(createDbChain());
      mockDb.delete.mockReturnValue(createDbChain());

      const result = await service.completeSignupFromReservation('cs_123');

      expect(result.error).toBeUndefined();
      expect(result.ticket).toMatchObject({ id: 99 });
      expect(mockPaymentsService.recordPayment).not.toHaveBeenCalled();
    });
  });

  describe('checkInTicket', () => {
    function makeValidQR(ticketId: number, userId: number, eventId: number): string {
      const crypto = require('crypto');
      const data = `${ticketId}:${userId}:${eventId}`;
      const secret = process.env.QR_SECRET || 'default-secret-change-in-production';
      const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
      return `${data}:${sig}`;
    }

    it('returns error for empty or invalid qrCodeData', async () => {
      expect(await service.checkInTicket('')).toEqual({
        success: false,
        error: 'Invalid QR code data',
      });
      expect(await service.checkInTicket('  ')).toEqual({
        success: false,
        error: 'Invalid or tampered QR code',
      });
      expect(await service.checkInTicket('invalid')).toEqual({
        success: false,
        error: 'Invalid or tampered QR code',
      });
      expect(await service.checkInTicket('1:2:3:bad-signature')).toEqual({
        success: false,
        error: 'Invalid or tampered QR code',
      });
    });

    it('returns error when ticket not found', async () => {
      const qr = makeValidQR(999, 5, 10);
      mockDb.select.mockReturnValue(createDbChain([]));

      const result = await service.checkInTicket(qr);

      expect(result).toEqual({ success: false, error: 'Ticket not found' });
    });

    it('returns alreadyCheckedIn when ticket already checked in', async () => {
      const qr = makeValidQR(1, 5, 10);
      const row = {
        ticketId: 1,
        checkedIn: true,
        eventName: 'Gala',
        eventDate: new Date('2026-06-15'),
        userName: 'Alice',
        userEmail: 'alice@test.com',
        busSeat: null,
        tableSeat: 'Table 3',
      };
      mockDb.select.mockReturnValue(createDbChain([row]));

      const result = await service.checkInTicket(qr);

      expect(result).toMatchObject({
        success: false,
        alreadyCheckedIn: true,
        error: 'Already checked in',
        ticket: {
          ticketId: 1,
          eventName: 'Gala',
          userName: 'Alice',
          userEmail: 'alice@test.com',
          busSeat: null,
          tableSeat: 'Table 3',
        },
      });
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('checks in ticket successfully and updates database', async () => {
      const qr = makeValidQR(1, 5, 10);
      const row = {
        ticketId: 1,
        checkedIn: false,
        eventName: 'Gala',
        eventDate: new Date('2026-06-15'),
        userName: 'Alice',
        userEmail: 'alice@test.com',
        busSeat: 'Bus 1 - Seat 5',
        tableSeat: null,
      };
      mockDb.select.mockReturnValue(createDbChain([row]));
      mockDb.update.mockReturnValue(createDbChain());

      const result = await service.checkInTicket(qr);

      expect(result).toMatchObject({
        success: true,
        ticket: {
          ticketId: 1,
          eventName: 'Gala',
          userName: 'Alice',
          userEmail: 'alice@test.com',
          busSeat: 'Bus 1 - Seat 5',
          tableSeat: null,
        },
      });
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
