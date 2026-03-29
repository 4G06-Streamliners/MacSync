import 'reflect-metadata';

jest.mock('../../src/backend/src/events/events.service', () => ({
  EventsService: jest.fn(),
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
  let mockAuthorizationService: {
    getStaffAccess: jest.Mock;
    assertCanManageEvent: jest.Mock;
    setEventAdminsForEvent: jest.Mock;
  };
  let mockVenueReportPdfService: { generateBuffer: jest.Mock };

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
      getTicketsForUserScoped: jest.fn(),
      createCheckoutSession: jest.fn(),
      releaseReservation: jest.fn(),
      checkInTicket: jest.fn(),
    };
    mockAuthorizationService = {
      getStaffAccess: jest.fn(),
      assertCanManageEvent: jest.fn().mockResolvedValue(undefined),
      setEventAdminsForEvent: jest.fn().mockResolvedValue(undefined),
    };
    mockVenueReportPdfService = { generateBuffer: jest.fn() };
    controller = new EventsController(
      mockEventsService,
      mockAuthorizationService as any,
      mockVenueReportPdfService as any,
    );
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
    const req = { user: { sub: 1 } } as any;
    const result = await controller.create(data as any, req);
    expect(result).toEqual({ id: 1, ...data });
  });

  it('update and delete assert access then delegate to service', async () => {
    const req = { user: { sub: 1 } } as any;
    mockEventsService.update.mockResolvedValue({ id: 1, name: 'Updated' });
    expect(await controller.update('1', { name: 'Updated' } as any, req)).toEqual({
      id: 1,
      name: 'Updated',
    });
    expect(mockAuthorizationService.assertCanManageEvent).toHaveBeenCalledWith(1, 1);

    mockEventsService.delete.mockResolvedValue({ deleted: true });
    expect(await controller.delete('1', req)).toEqual({ deleted: true });
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

  it('getUserTickets allows own access, global admin, and scoped staff; denies others', async () => {
    mockEventsService.getTicketsForUser.mockResolvedValue([{ ticketId: 1 }]);

    const ownReq = { user: { sub: 5 } } as any;
    expect(await controller.getUserTickets('5', ownReq)).toEqual([{ ticketId: 1 }]);

    mockAuthorizationService.getStaffAccess.mockResolvedValue({
      isSystemAdmin: true,
      isGlobalAdmin: true,
      managedEventIds: [],
    });
    const adminReq = { user: { sub: 1 } } as any;
    expect(await controller.getUserTickets('5', adminReq)).toEqual([{ ticketId: 1 }]);
    expect(mockEventsService.getTicketsForUser).toHaveBeenCalledWith(5);

    mockEventsService.getTicketsForUserScoped.mockResolvedValue([{ ticketId: 2 }]);
    mockAuthorizationService.getStaffAccess.mockResolvedValue({
      isSystemAdmin: false,
      isGlobalAdmin: false,
      managedEventIds: [3],
    });
    expect(await controller.getUserTickets('7', adminReq)).toEqual([{ ticketId: 2 }]);
    expect(mockEventsService.getTicketsForUserScoped).toHaveBeenCalled();

    mockAuthorizationService.getStaffAccess.mockResolvedValue({
      isSystemAdmin: false,
      isGlobalAdmin: false,
      managedEventIds: [],
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

  it('checkIn passes qrCodeData and admin user id to service', async () => {
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
    const req = { user: { sub: 42 } } as any;

    expect(await controller.checkIn(qrData, req)).toEqual(result);
    expect(mockEventsService.checkInTicket).toHaveBeenCalledWith(qrData, 42);
  });

  it('checkIn passes empty string when qrCodeData is undefined', async () => {
    mockEventsService.checkInTicket.mockResolvedValue({ success: false, error: 'Invalid QR code data' });
    const req = { user: { sub: 1 } } as any;

    await controller.checkIn(undefined as any, req);
    expect(mockEventsService.checkInTicket).toHaveBeenCalledWith('', 1);
  });
});
