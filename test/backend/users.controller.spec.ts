import 'reflect-metadata';

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
  Roles: (..._roles: string[]) =>
    (_target: any, _key?: string, _desc?: any) => {},
}));
jest.mock('../../src/backend/src/db/schema', () => ({}));

import { UsersController } from '../../src/backend/src/users/users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      findAll: jest.fn(),
      findOneWithRoles: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      verifyUserPassword: jest.fn(),
      replaceRoles: jest.fn(),
      delete: jest.fn(),
    };
    controller = new UsersController(mockService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('delegates to usersService.findAll', async () => {
      const users = [{ id: 1 }, { id: 2 }];
      mockService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('calls findOneWithRoles with parsed numeric id', async () => {
      const user = { id: 5, email: 'test@mcmaster.ca', roles: ['Member'] };
      mockService.findOneWithRoles.mockResolvedValue(user);

      const result = await controller.findOne('5');

      expect(result).toEqual(user);
      expect(mockService.findOneWithRoles).toHaveBeenCalledWith(5);
    });
  });

  describe('create', () => {
    it('delegates to usersService.create with body', async () => {
      const newUser = { email: 'new@mcmaster.ca', name: 'New' } as any;
      const created = { id: 10, ...newUser };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(newUser);

      expect(result).toEqual(created);
      expect(mockService.create).toHaveBeenCalledWith(newUser);
    });
  });

  describe('update', () => {
    it('updates user and returns refreshed user with roles', async () => {
      const body = { name: 'Updated Name' };
      const req = { user: { sub: 1, email: 'admin@mcmaster.ca' } } as any;
      const updatedUser = { id: 5, name: 'Updated Name', roles: ['Member'] };

      mockService.update.mockResolvedValue(undefined);
      mockService.findOneWithRoles.mockResolvedValue(updatedUser);

      const result = await controller.update('5', body, req);

      expect(result).toEqual(updatedUser);
      expect(mockService.update).toHaveBeenCalledWith(5, body);
      expect(mockService.findOneWithRoles).toHaveBeenCalledWith(5);
    });

    it('requires password when changing isSystemAdmin', async () => {
      const body = { isSystemAdmin: true, password: 'Password123' };
      const req = { user: { sub: 1, email: 'admin@mcmaster.ca' } } as any;
      const updatedUser = { id: 5, isSystemAdmin: true, roles: ['Admin'] };

      mockService.verifyUserPassword.mockResolvedValue(true);
      mockService.update.mockResolvedValue(undefined);
      mockService.findOneWithRoles.mockResolvedValue(updatedUser);

      const result = await controller.update('5', body, req);

      expect(result).toEqual(updatedUser);
      expect(mockService.verifyUserPassword).toHaveBeenCalledWith(
        1,
        'Password123',
      );
      // password should be stripped before calling update
      expect(mockService.update).toHaveBeenCalledWith(5, {
        isSystemAdmin: true,
      });
    });

    it('throws BadRequestException when isSystemAdmin set without password', async () => {
      const body = { isSystemAdmin: true };
      const req = { user: { sub: 1, email: 'admin@mcmaster.ca' } } as any;

      await expect(controller.update('5', body, req)).rejects.toThrow(
        'Password is required to change admin role.',
      );
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password is invalid', async () => {
      const body = { isSystemAdmin: true, password: 'wrong' };
      const req = { user: { sub: 1, email: 'admin@mcmaster.ca' } } as any;

      mockService.verifyUserPassword.mockResolvedValue(false);

      await expect(controller.update('5', body, req)).rejects.toThrow(
        'Invalid password.',
      );
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('throws Error when user not found after update', async () => {
      const body = { name: 'Ghost' };
      const req = { user: { sub: 1, email: 'admin@mcmaster.ca' } } as any;

      mockService.update.mockResolvedValue(undefined);
      mockService.findOneWithRoles.mockResolvedValue(null);

      await expect(controller.update('999', body, req)).rejects.toThrow(
        'User not found after update',
      );
    });
  });

  describe('updateRoles', () => {
    it('delegates to replaceRoles with parsed id and roles array', async () => {
      const updated = { id: 5, roles: ['Admin', 'Member'] };
      mockService.replaceRoles.mockResolvedValue(updated);

      const result = await controller.updateRoles('5', {
        roles: ['Admin', 'Member'],
      });

      expect(result).toEqual(updated);
      expect(mockService.replaceRoles).toHaveBeenCalledWith(5, [
        'Admin',
        'Member',
      ]);
    });

    it('defaults to empty array when roles is not provided', async () => {
      const updated = { id: 5, roles: [] };
      mockService.replaceRoles.mockResolvedValue(updated);

      const result = await controller.updateRoles('5', {});

      expect(result).toEqual(updated);
      expect(mockService.replaceRoles).toHaveBeenCalledWith(5, []);
    });

    it('defaults to empty array when roles is not an array', async () => {
      const updated = { id: 5, roles: [] };
      mockService.replaceRoles.mockResolvedValue(updated);

      const result = await controller.updateRoles('5', {
        roles: 'Admin' as any,
      });

      expect(result).toEqual(updated);
      expect(mockService.replaceRoles).toHaveBeenCalledWith(5, []);
    });
  });

  describe('delete', () => {
    it('delegates to usersService.delete with parsed numeric id', async () => {
      mockService.delete.mockResolvedValue({ deleted: true });

      const result = await controller.delete('5');

      expect(result).toEqual({ deleted: true });
      expect(mockService.delete).toHaveBeenCalledWith(5);
    });
  });
});
