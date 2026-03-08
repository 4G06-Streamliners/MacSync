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

    mockUsersService = {
      findOneWithRoles: jest.fn(),
    };

    controller = new EventsController(mockEventsService, mockUsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all events from the service', async () => {
      const events = [
        { id: 1, name: 'Event A' },
        { id: 2, name: 'Event B' },
      ];
      mockEventsService.findAll.mockResolvedValue(events);

      const result = await controller.findAll();

      expect(result).toEqual(events);
      expect(mockEventsService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a single event by id', async () => {
      const event = { id: 1, name: 'Test Event', registeredCount: 10 };
      mockEventsService.findOne.mockResolvedValue(event);

      const result = await controller.findOne('1');

      expect(result).toEqual(event);
      expect(mockEventsService.findOne).toHaveBeenCalledWith(1, undefined);
    });

    it('should pass userId when provided as query param', async () => {
      const event = { id: 1, name: 'Test Event', userTicket: null };
      mockEventsService.findOne.mockResolvedValue(event);

      await controller.findOne('1', '5');

      expect(mockEventsService.findOne).toHaveBeenCalledWith(1, 5);
    });

    it('should treat empty userId string as undefined', async () => {
      mockEventsService.findOne.mockResolvedValue(null);

      await controller.findOne('1', '');

      expect(mockEventsService.findOne).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('create', () => {
    it('should create a new event via the service', async () => {
      const eventData = {
        name: 'New Event',
        date: new Date('2026-06-15'),
        capacity: 100,
        price: 2500,
      };
      const created = { id: 1, ...eventData };
      mockEventsService.create.mockResolvedValue(created);

      const result = await controller.create(eventData as any);

      expect(result).toEqual(created);
      expect(mockEventsService.create).toHaveBeenCalledWith(eventData);
    });
  });

  describe('update', () => {
    it('should update an event and return the result', async () => {
      const updateData = { name: 'Updated Event' };
      const updated = { id: 1, name: 'Updated Event' };
      mockEventsService.update.mockResolvedValue(updated);

      const result = await controller.update('1', updateData as any);

      expect(result).toEqual(updated);
      expect(mockEventsService.update).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe('delete', () => {
    it('should delete an event by id', async () => {
      mockEventsService.delete.mockResolvedValue({ deleted: true });

      const result = await controller.delete('1');

      expect(result).toEqual({ deleted: true });
      expect(mockEventsService.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('signup', () => {
    it('should sign up the authenticated user for an event', async () => {
      const ticket = { id: 1, userId: 5, eventId: 1 };
      mockEventsService.signup.mockResolvedValue({ ticket });

      const req = { user: { sub: 5, email: 'user@test.com' } } as any;
      const result = await controller.signup('1', req);

      expect(result).toEqual({ ticket });
      expect(mockEventsService.signup).toHaveBeenCalledWith(1, 5, undefined);
    });

    it('should pass selectedTable when provided', async () => {
      mockEventsService.signup.mockResolvedValue({ ticket: {} });

      const req = { user: { sub: 5, email: 'user@test.com' } } as any;
      await controller.signup('1', req, 3);

      expect(mockEventsService.signup).toHaveBeenCalledWith(1, 5, 3);
    });

    it('should rethrow errors from the service', async () => {
      mockEventsService.signup.mockRejectedValue(new Error('Event is full'));

      const req = { user: { sub: 5, email: 'user@test.com' } } as any;

      await expect(controller.signup('1', req)).rejects.toThrow(
        'Event is full',
      );
    });
  });

  describe('cancelSignup', () => {
    it('should cancel a user signup', async () => {
      mockEventsService.cancelSignup.mockResolvedValue({ cancelled: true });

      const req = { user: { sub: 5, email: 'user@test.com' } } as any;
      const result = await controller.cancelSignup('1', req);

      expect(result).toEqual({ cancelled: true });
      expect(mockEventsService.cancelSignup).toHaveBeenCalledWith(1, 5);
    });

    it('should return error when not signed up', async () => {
      mockEventsService.cancelSignup.mockResolvedValue({
        error: 'Not signed up for this event',
      });

      const req = { user: { sub: 5, email: 'user@test.com' } } as any;
      const result = await controller.cancelSignup('1', req);

      expect(result).toEqual({ error: 'Not signed up for this event' });
    });
  });

  describe('getUserTickets', () => {
    it('should allow a user to get their own tickets', async () => {
      const tickets = [{ ticketId: 1, eventId: 1, eventName: 'Gala' }];
      mockEventsService.getTicketsForUser.mockResolvedValue(tickets);

      const req = { user: { sub: 5, email: 'user@test.com' } } as any;
      const result = await controller.getUserTickets('5', req);

      expect(result).toEqual(tickets);
      expect(mockEventsService.getTicketsForUser).toHaveBeenCalledWith(5);
    });

    it("should allow admin to access another user's tickets", async () => {
      const tickets = [{ ticketId: 2, eventId: 1 }];
      mockEventsService.getTicketsForUser.mockResolvedValue(tickets);
      mockUsersService.findOneWithRoles.mockResolvedValue({
        id: 1,
        isSystemAdmin: true,
        roles: ['Admin'],
      });

      const req = { user: { sub: 1, email: 'admin@test.com' } } as any;
      const result = await controller.getUserTickets('5', req);

      expect(result).toEqual(tickets);
      expect(mockUsersService.findOneWithRoles).toHaveBeenCalledWith(1);
    });

    it("should allow role-based admin to access another user's tickets", async () => {
      mockEventsService.getTicketsForUser.mockResolvedValue([]);
      mockUsersService.findOneWithRoles.mockResolvedValue({
        id: 3,
        isSystemAdmin: false,
        roles: ['Admin'],
      });

      const req = { user: { sub: 3, email: 'roleadmin@test.com' } } as any;
      const result = await controller.getUserTickets('5', req);

      expect(result).toEqual([]);
    });

    it("should throw ForbiddenException for non-admin accessing another user's tickets", async () => {
      mockUsersService.findOneWithRoles.mockResolvedValue({
        id: 2,
        isSystemAdmin: false,
        roles: [],
      });

      const req = { user: { sub: 2, email: 'user@test.com' } } as any;

      await expect(controller.getUserTickets('5', req)).rejects.toThrow(
        'Access denied.',
      );
    });
  });

  describe('releaseCheckoutReservation', () => {
    it('should release a checkout reservation', async () => {
      mockEventsService.releaseReservation.mockResolvedValue(undefined);

      const result =
        await controller.releaseCheckoutReservation('cs_test_123');

      expect(result).toEqual({ released: true });
      expect(mockEventsService.releaseReservation).toHaveBeenCalledWith(
        'cs_test_123',
      );
    });
  });
});
