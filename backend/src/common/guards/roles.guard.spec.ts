import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { RoleName } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should allow access if no roles are required on route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext({ id: '1', roles: ['RECEPTIONIST'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required ADMIN role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleName.ADMIN]);
    const context = createMockContext({ id: '1', roles: [RoleName.ADMIN] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access and throw ForbiddenException (403) if receptionist hits admin-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleName.ADMIN]);
    const context = createMockContext({ id: '2', roles: [RoleName.RECEPTIONIST] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access if doctor hits inventory-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleName.INVENTORY_MANAGER]);
    const context = createMockContext({ id: '3', roles: [RoleName.DOCTOR] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
