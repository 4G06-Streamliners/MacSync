import 'reflect-metadata';

jest.mock('../../src/backend/src/events/events.service', () => ({
  EventsService: jest.fn(),
}));
jest.mock('../../src/backend/src/users/users.service', () => ({
  UsersService: jest.fn(),
}));
jest.mock('../../src/backend/src/auth/jwt-auth.guard', () => ({
  JwtAuthGuard: class {
    canActivate() {
      return true;
    }
  },
}));
jest.mock('../../src/backend/src/auth/roles.decorator', () => ({
  Roles: () => () => {},
  ROLES_KEY: 'roles',
}));
jest.mock('../../src/backend/src/db/schema', () => ({}));

import { EventsController } from '../../src/backend/src/events/events.controller';

describe('EventsController', () => {
  let controller: EventsController;
  let mockEventsService: any;
  let mockUsersService: any;

  beforeEach(() => {
    mockEventsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      signup: jest.fn(),
      cancelSignup: jest.fn(),
      getTicketsForUser: jest.fn(),
      createCheckoutSession: jest.fn(),
      releaseReservation: jest.fn(),
      checkInTicket: jest.fn(),
    };
    mockUsersService = { findOneWithRoles: jest.fn() };
    controller = new EventsController(mockEventsService, mockUsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll returns all events', async () => {
    const events = [{ id: 1 }, { id: 2 }];
    mockEventsService.findAll.mockResolvedValue(events);
    expect(await controller.findAll()).toEqual(events);
  });

  it('findOne passes parsed id and optional userId', async () => {
    mockEventsService.findOne.mockResolvedValue({ id: 1 });
    await controller.findOne('1', '5');
    expect(mockEventsService.findOne).toHaveBeenCalledWith(1, 5);

    await controller.findOne('1', '');
    expect(mockEventsService.findOne).toHaveBeenCalledWith(1, undefined);
  });

  it('create delegates to service', async () => {
    const data = { name: 'New Event', capacity: 100 };
    mockEventsService.create.mockResolvedValue({ id: 1, ...data });
    const result = await controller.create(data as any);
    expect(result).toEqual({ id: 1, ...data });
  });

  it('update and delete delegate to service', async () => {
    mockEventsService.update.mockResolvedValue({ id: 1, name: 'Updated' });
    expect(await controller.update('1', { name: 'Updated' } as any)).toEqual({ id: 1, name: 'Updated' });

    mockEventsService.delete.mockResolvedValue({ deleted: true });
    expect(await controller.delete('1')).toEqual({ deleted: true });
  });

  it('signup passes user id and optional table, rethrows errors', async () => {
    mockEventsService.signup.mockResolvedValue({ ticket: { id: 1 } });
    const req = { user: { sub: 5 } } as any;

    await controller.signup('1', req, 3);
    expect(mockEventsService.signup).toHaveBeenCalledWith(1, 5, 3);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockEventsService.signup.mockRejectedValue(new Error('Event is full'));
    await expect(controller.signup('1', req)).rejects.toThrow('Event is full');
    consoleErrorSpy.mockRestore();
  });

  it('cancelSignup delegates to service', async () => {
    mockEventsService.cancelSignup.mockResolvedValue({ cancelled: true });
    const req = { user: { sub: 5 } } as any;
    expect(await controller.cancelSignup('1', req)).toEqual({ cancelled: true });
  });

  it('getUserTickets allows own access and admin access, denies non-admin', async () => {
    mockEventsService.getTicketsForUser.mockResolvedValue([{ ticketId: 1 }]);

    const ownReq = { user: { sub: 5 } } as any;
    expect(await controller.getUserTickets('5', ownReq)).toEqual([{ ticketId: 1 }]);

    mockUsersService.findOneWithRoles.mockResolvedValue({
      id: 1, isSystemAdmin: true, roles: ['Admin'],
    });
    const adminReq = { user: { sub: 1 } } as any;
    expect(await controller.getUserTickets('5', adminReq)).toEqual([{ ticketId: 1 }]);

    mockUsersService.findOneWithRoles.mockResolvedValue({
      id: 2, isSystemAdmin: false, roles: [],
    });
    const userReq = { user: { sub: 2 } } as any;
    await expect(controller.getUserTickets('5', userReq)).rejects.toThrow('Access denied.');
  });

  it('createCheckoutSession passes event id, user id, urls and optional selectedTable', async () => {
    mockEventsService.createCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.com/session',
      sessionId: 'cs_test_123',
    });
    const req = { user: { sub: 5 } } as any;
    const body = {
      successUrl: 'https://app.example/payment-success',
      cancelUrl: 'https://app.example/payment-cancel',
    };

    const result = await controller.createCheckoutSession('10', req, body);

    expect(result).toEqual({ url: 'https://checkout.stripe.com/session', sessionId: 'cs_test_123' });
    expect(mockEventsService.createCheckoutSession).toHaveBeenCalledWith(
      10,
      5,
      'https://app.example/payment-success',
      'https://app.example/payment-cancel',
      undefined,
    );
  });

  it('createCheckoutSession passes selectedTable when provided', async () => {
    mockEventsService.createCheckoutSession.mockResolvedValue({ sessionId: 'cs_1' });
    const req = { user: { sub: 3 } } as any;
    const body = {
      successUrl: 'https://x/s',
      cancelUrl: 'https://x/c',
      selectedTable: 2,
    };

    await controller.createCheckoutSession('1', req, body);

    expect(mockEventsService.createCheckoutSession).toHaveBeenCalledWith(
      1,
      3,
      'https://x/s',
      'https://x/c',
      2,
    );
  });

  it('releaseCheckoutReservation delegates to service', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockEventsService.releaseReservation.mockResolvedValue(undefined);
    expect(await controller.releaseCheckoutReservation('cs_123')).toEqual({ released: true });
    consoleLogSpy.mockRestore();
  });

  it('checkIn passes qrCodeData to service and returns result', async () => {
    const qrData = '1:5:10:abc123valid';
    const result = {
      success: true,
      ticket: {
        ticketId: 1,
        eventName: 'Gala',
        userName: 'Alice',
        userEmail: 'alice@test.com',
      },
    };
    mockEventsService.checkInTicket.mockResolvedValue(result);

    expect(await controller.checkIn(qrData)).toEqual(result);
    expect(mockEventsService.checkInTicket).toHaveBeenCalledWith(qrData);
  });

  it('checkIn passes empty string when qrCodeData is undefined', async () => {
    mockEventsService.checkInTicket.mockResolvedValue({ success: false, error: 'Invalid QR code data' });

    await controller.checkIn(undefined as any);
    expect(mockEventsService.checkInTicket).toHaveBeenCalledWith('');
  });
});
