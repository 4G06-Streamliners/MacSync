import 'reflect-metadata';

jest.mock('../../src/backend/src/database/database.service', () => ({
  DatabaseService: jest.fn(),
}));
jest.mock('../../src/backend/src/db/schema', () => ({
  users: { id: 'users.id', email: 'users.email', passwordHash: 'users.passwordHash' },
  userRoles: { userId: 'userRoles.userId', roleId: 'userRoles.roleId' },
  roles: { id: 'roles.id', name: 'roles.name' },
  eventAdmins: { userId: 'eventAdmins.userId', eventId: 'eventAdmins.eventId' },
}));

import { UsersService } from '../../src/backend/src/users/users.service';
import { createDbChain } from './helpers/db-chain';

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new UsersService({ db: mockDb } as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findOneWithRoles', () => {
    it('returns user with populated roles array', async () => {
      const user = {
        id: 1,
        email: 'admin@mcmaster.ca',
        name: 'Admin',
        passwordHash: 'hashed',
      };
      const roleRows = [{ roleName: 'Admin' }, { roleName: 'Member' }];

      mockDb.select
        .mockReturnValueOnce(createDbChain([user]))
        .mockReturnValueOnce(createDbChain(roleRows))
        .mockReturnValueOnce(createDbChain([]));

      const result = await service.findOneWithRoles(1);

      expect(result).toEqual({
        id: 1,
        email: 'admin@mcmaster.ca',
        name: 'Admin',
        roles: ['Admin', 'Member'],
        managedEventIds: [],
      });
    });

    it('strips passwordHash from the returned object', async () => {
      const user = {
        id: 1,
        email: 'test@mcmaster.ca',
        passwordHash: 'secret_hash',
      };

      mockDb.select
        .mockReturnValueOnce(createDbChain([user]))
        .mockReturnValueOnce(createDbChain([]))
        .mockReturnValueOnce(createDbChain([]));

      const result = await service.findOneWithRoles(1);

      expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns null when user does not exist', async () => {
      mockDb.select.mockReturnValue(createDbChain([]));

      const result = await service.findOneWithRoles(999);

      expect(result).toBeNull();
    });

    it('returns empty roles array when user has no role assignments', async () => {
      const user = { id: 2, email: 'bob@mcmaster.ca', passwordHash: null };

      mockDb.select
        .mockReturnValueOnce(createDbChain([user]))
        .mockReturnValueOnce(createDbChain([]))
        .mockReturnValueOnce(createDbChain([]));

      const result = await service.findOneWithRoles(2);

      expect(result).toMatchObject({ id: 2, roles: [], managedEventIds: [] });
    });
  });

  describe('replaceRoles', () => {
    it('replaces existing roles with new ones', async () => {
      const allRoles = [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'Member' },
      ];
      const updatedUser = { id: 5, email: 'alice@mcmaster.ca', roles: ['Member'] };

      // select().from(roles) -> all roles
      mockDb.select.mockReturnValueOnce(createDbChain(allRoles));
      // delete existing user_roles
      mockDb.delete.mockReturnValueOnce(createDbChain());
      // insert new user_roles
      mockDb.insert.mockReturnValueOnce(createDbChain());

      // findOneWithRoles is called internally at the end:
      // select user
      mockDb.select.mockReturnValueOnce(
        createDbChain([{ id: 5, email: 'alice@mcmaster.ca', passwordHash: null }]),
      );
      // select user roles
      mockDb.select.mockReturnValueOnce(createDbChain([{ roleName: 'Member' }]));
      mockDb.select.mockReturnValueOnce(createDbChain([]));

      const result = await service.replaceRoles(5, ['Member']);

      expect(result).toMatchObject({ id: 5, roles: ['Member'], managedEventIds: [] });
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('throws BadRequestException for non-existent role names', async () => {
      const allRoles = [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'Member' },
      ];
      mockDb.select.mockReturnValueOnce(createDbChain(allRoles));

      await expect(service.replaceRoles(5, ['SuperAdmin'])).rejects.toThrow(
        /Role\(s\) not found: SuperAdmin\. Available roles: Admin, Member/,
      );
    });

    it('handles empty role array (removes all roles)', async () => {
      const allRoles = [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'Member' },
      ];

      mockDb.select.mockReturnValueOnce(createDbChain(allRoles));
      mockDb.delete.mockReturnValueOnce(createDbChain());

      // findOneWithRoles after clearing:
      mockDb.select.mockReturnValueOnce(
        createDbChain([{ id: 5, email: 'alice@mcmaster.ca', passwordHash: null }]),
      );
      mockDb.select.mockReturnValueOnce(createDbChain([]));
      mockDb.select.mockReturnValueOnce(createDbChain([]));

      const result = await service.replaceRoles(5, []);

      expect(result).toMatchObject({ id: 5, roles: [], managedEventIds: [] });
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('returns the updated user with new roles', async () => {
      const allRoles = [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'Member' },
      ];

      mockDb.select.mockReturnValueOnce(createDbChain(allRoles));
      mockDb.delete.mockReturnValueOnce(createDbChain());
      mockDb.insert.mockReturnValueOnce(createDbChain());

      mockDb.select.mockReturnValueOnce(
        createDbChain([{ id: 3, email: 'bob@mcmaster.ca', passwordHash: 'hash' }]),
      );
      mockDb.select.mockReturnValueOnce(
        createDbChain([{ roleName: 'Admin' }, { roleName: 'Member' }]),
      );
      mockDb.select.mockReturnValueOnce(createDbChain([]));

      const result = await service.replaceRoles(3, ['Admin', 'Member']);

      expect(result).toMatchObject({
        id: 3,
        roles: ['Admin', 'Member'],
        managedEventIds: [],
      });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
