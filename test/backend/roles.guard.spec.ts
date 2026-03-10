import 'reflect-metadata';

jest.mock('../../src/backend/src/users/users.service', () => ({
  UsersService: jest.fn(),
}));
jest.mock('../../src/backend/src/db/schema', () => ({
  users: { id: 'users.id' },
  userRoles: { userId: 'userRoles.userId', roleId: 'userRoles.roleId' },
  roles: { id: 'roles.id', name: 'roles.name' },
}));

import { RolesGuard } from '../../src/backend/src/auth/roles.guard';

function createMockContext(user?: { sub?: number }) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: any;
  let mockUsersService: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    mockUsersService = {
      findOneWithRoles: jest.fn(),
    };
    guard = new RolesGuard(mockReflector, mockUsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('allows access when no @Roles() metadata is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ sub: 1 });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockUsersService.findOneWithRoles).not.toHaveBeenCalled();
  });

  it('allows access when roles metadata is an empty array', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext({ sub: 1 });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('allows access when user has the required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['Admin']);
    mockUsersService.findOneWithRoles.mockResolvedValue({
      id: 1,
      roles: ['Admin'],
      isSystemAdmin: false,
    });
    const context = createMockContext({ sub: 1 });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockUsersService.findOneWithRoles).toHaveBeenCalledWith(1);
  });

  it('allows access when user has isSystemAdmin (implicit Admin)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['Admin']);
    mockUsersService.findOneWithRoles.mockResolvedValue({
      id: 2,
      roles: ['Member'],
      isSystemAdmin: true,
    });
    const context = createMockContext({ sub: 2 });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('denies access when user lacks required roles', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['Admin']);
    mockUsersService.findOneWithRoles.mockResolvedValue({
      id: 3,
      roles: ['Member'],
      isSystemAdmin: false,
    });
    const context = createMockContext({ sub: 3 });

    await expect(guard.canActivate(context)).rejects.toThrow('Access denied.');
  });

  it('denies access when req.user is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['Admin']);
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow('Access denied.');
    expect(mockUsersService.findOneWithRoles).not.toHaveBeenCalled();
  });

  it('denies access when req.user has no sub', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['Admin']);
    const context = createMockContext({} as any);

    await expect(guard.canActivate(context)).rejects.toThrow('Access denied.');
  });

  it('denies access when findOneWithRoles returns null', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['Admin']);
    mockUsersService.findOneWithRoles.mockResolvedValue(null);
    const context = createMockContext({ sub: 999 });

    await expect(guard.canActivate(context)).rejects.toThrow('Access denied.');
  });

  it('denies access when findOneWithRoles throws an error', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['Admin']);
    mockUsersService.findOneWithRoles.mockRejectedValue(
      new Error('DB connection lost'),
    );
    const context = createMockContext({ sub: 1 });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(guard.canActivate(context)).rejects.toThrow('Access denied.');
    consoleSpy.mockRestore();
  });
});
