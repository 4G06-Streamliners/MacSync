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

  it('releaseCheckoutReservation delegates to service', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockEventsService.releaseReservation.mockResolvedValue(undefined);
    expect(await controller.releaseCheckoutReservation('cs_123')).toEqual({ released: true });
    consoleLogSpy.mockRestore();
  });
});
