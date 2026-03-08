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
  seatReservations: { id: 'seatReservations.id' },
}));

const mockCreateTableSeats = jest.fn();
const mockCreateBusSeats = jest.fn();
jest.mock('../../src/backend/src/db/seed-data', () => ({
  createTableSeatsForEvent: mockCreateTableSeats,
  createBusSeatsForEvent: mockCreateBusSeats,
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

    service = new EventsService(
      { db: mockDb } as any,
      mockPaymentsService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all events with registered counts', async () => {
      const events = [
        { id: 1, name: 'Event A', registeredCount: 10 },
        { id: 2, name: 'Event B', registeredCount: 5 },
      ];
      const chain = createDbChain(events);
      mockDb.select.mockReturnValue(chain);

      const result = await service.findAll();

      expect(result).toEqual(events);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return empty array when no events exist', async () => {
      const chain = createDbChain([]);
      mockDb.select.mockReturnValue(chain);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single event by id', async () => {
      const event = { id: 1, name: 'Test Event', registeredCount: 10 };
      const chain = createDbChain([event]);
      mockDb.select.mockReturnValue(chain);

      const result = await service.findOne(1);

      expect(result).toEqual({ ...event, userTicket: null });
    });

    it('should return null when event is not found', async () => {
      const chain = createDbChain([]);
      mockDb.select.mockReturnValue(chain);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });

    it('should include userTicket when userId is provided and ticket exists', async () => {
      const event = { id: 1, name: 'Test Event' };
      const ticket = { tableSeat: 'Table 1, Seat 3', busSeat: null };

      const eventChain = createDbChain([event]);
      const ticketChain = createDbChain([ticket]);

      mockDb.select
        .mockReturnValueOnce(eventChain)
        .mockReturnValueOnce(ticketChain);

      const result = await service.findOne(1, 5);

      expect(result).toEqual({
        ...event,
        userTicket: { tableSeat: 'Table 1, Seat 3', busSeat: null },
      });
    });

    it('should return null userTicket when user has no ticket for the event', async () => {
      const event = { id: 1, name: 'Test Event' };

      const eventChain = createDbChain([event]);
      const ticketChain = createDbChain([]);

      mockDb.select
        .mockReturnValueOnce(eventChain)
        .mockReturnValueOnce(ticketChain);

      const result = await service.findOne(1, 5);

      expect(result).toEqual({ ...event, userTicket: null });
    });
  });

  describe('create', () => {
    it('should insert an event and return the created record', async () => {
      const newEvent = {
        name: 'New Event',
        date: '2026-06-15T18:00:00Z',
        capacity: 100,
        price: 2500,
        requiresTableSignup: false,
        requiresBusSignup: false,
      };
      const created = {
        id: 1,
        ...newEvent,
        date: new Date('2026-06-15T18:00:00Z'),
        tableCount: null,
        seatsPerTable: null,
        busCount: null,
        busCapacity: null,
      };

      const chain = createDbChain([created]);
      mockDb.insert.mockReturnValue(chain);

      const result = await service.create(newEvent as any);

      expect(result).toEqual(created);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should auto-create table seats when requiresTableSignup is true', async () => {
      const created = {
        id: 1,
        name: 'Table Event',
        requiresTableSignup: true,
        tableCount: 5,
        seatsPerTable: 8,
        requiresBusSignup: false,
        busCount: null,
        busCapacity: null,
      };

      const chain = createDbChain([created]);
      mockDb.insert.mockReturnValue(chain);

      await service.create({
        name: 'Table Event',
        date: '2026-06-15T18:00:00Z',
        capacity: 40,
        price: 0,
        requiresTableSignup: true,
        tableCount: 5,
        seatsPerTable: 8,
      } as any);

      expect(mockCreateTableSeats).toHaveBeenCalledWith(mockDb, 1, 5, 8);
    });

    it('should auto-create bus seats when requiresBusSignup is true', async () => {
      const created = {
        id: 2,
        name: 'Bus Event',
        requiresTableSignup: false,
        tableCount: null,
        seatsPerTable: null,
        requiresBusSignup: true,
        busCount: 2,
        busCapacity: 50,
      };

      const chain = createDbChain([created]);
      mockDb.insert.mockReturnValue(chain);

      await service.create({
        name: 'Bus Event',
        date: '2026-06-15T18:00:00Z',
        capacity: 100,
        price: 0,
        requiresBusSignup: true,
        busCount: 2,
        busCapacity: 50,
      } as any);

      expect(mockCreateBusSeats).toHaveBeenCalledWith(mockDb, 2, 2, 50);
    });

    it('should not create table/bus seats when not required', async () => {
      const created = {
        id: 3,
        name: 'Simple Event',
        requiresTableSignup: false,
        requiresBusSignup: false,
        tableCount: null,
        seatsPerTable: null,
        busCount: null,
        busCapacity: null,
      };

      const chain = createDbChain([created]);
      mockDb.insert.mockReturnValue(chain);

      await service.create({
        name: 'Simple Event',
        date: '2026-06-15T18:00:00Z',
        capacity: 50,
        price: 0,
      } as any);

      expect(mockCreateTableSeats).not.toHaveBeenCalled();
      expect(mockCreateBusSeats).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an event and return the updated record', async () => {
      const updated = { id: 1, name: 'Updated Event' };
      const chain = createDbChain([updated]);
      mockDb.update.mockReturnValue(chain);

      const result = await service.update(1, { name: 'Updated Event' } as any);

      expect(result).toEqual(updated);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an event and return { deleted: true }', async () => {
      const chain = createDbChain();
      mockDb.delete.mockReturnValue(chain);

      const result = await service.delete(1);

      expect(result).toEqual({ deleted: true });
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('cancelSignup', () => {
    it('should return error when user is not signed up', async () => {
      const chain = createDbChain([]);
      mockDb.select.mockReturnValue(chain);

      const result = await service.cancelSignup(1, 5);

      expect(result).toEqual({ error: 'Not signed up for this event' });
    });

    it('should free seats and delete ticket on successful cancel', async () => {
      const ticket = { id: 10, userId: 5, eventId: 1 };

      const selectChain = createDbChain([ticket]);
      mockDb.select.mockReturnValue(selectChain);

      const updateChain1 = createDbChain();
      const updateChain2 = createDbChain();
      mockDb.update
        .mockReturnValueOnce(updateChain1)
        .mockReturnValueOnce(updateChain2);

      const deleteChain = createDbChain();
      mockDb.delete.mockReturnValue(deleteChain);

      const result = await service.cancelSignup(1, 5);

      expect(result).toEqual({ cancelled: true });
      expect(mockDb.update).toHaveBeenCalledTimes(2);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('getTicketsForUser', () => {
    it('should return tickets for a given user', async () => {
      const tickets = [
        {
          ticketId: 1,
          eventId: 1,
          checkedIn: false,
          busSeat: null,
          tableSeat: null,
          qrCodeData: 'qr-data',
          createdAt: new Date(),
          eventName: 'Gala Night',
          eventDate: new Date(),
          eventLocation: 'Grand Ballroom',
          eventPrice: 2500,
          eventImageUrl: null,
        },
      ];
      const chain = createDbChain(tickets);
      mockDb.select.mockReturnValue(chain);

      const result = await service.getTicketsForUser(5);

      expect(result).toEqual(tickets);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return empty array when user has no tickets', async () => {
      const chain = createDbChain([]);
      mockDb.select.mockReturnValue(chain);

      const result = await service.getTicketsForUser(99);

      expect(result).toEqual([]);
    });
  });

  describe('releaseReservation', () => {
    it('should delete the seat reservation by stripe session id', async () => {
      const chain = createDbChain();
      mockDb.delete.mockReturnValue(chain);

      await service.releaseReservation('cs_test_session_123');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
