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
});
