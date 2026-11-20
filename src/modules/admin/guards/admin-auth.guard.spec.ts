import { UnauthorizedException } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard.js';

describe('AdminAuthGuard', () => {
  it('rejects requests without an admin session', async () => {
    const guard = new AdminAuthGuard({} as never);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ session: {} }) }),
    } as never;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
