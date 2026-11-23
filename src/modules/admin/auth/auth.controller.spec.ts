import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  it('regenerates the session before saving authenticated state on login', async () => {
    const regenerate = vi.fn((callback: (error?: Error | null) => void) =>
      callback(null),
    );
    const save = vi.fn((callback: (error?: Error | null) => void) =>
      callback(null),
    );
    const validateAdmin = vi.fn().mockResolvedValue({
      id: 'a1',
      name: 'Admin',
      email: 'user@example.com',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      sessionVersion: 2,
    });
    const updateLastLogin = vi.fn().mockResolvedValue(undefined);
    const audit = vi.fn().mockResolvedValue(undefined);
    const controller = new AuthController(
      { validateAdmin, updateLastLogin } as never,
      {} as never,
      { log: audit } as never,
    );
    const request = {
      session: { regenerate, save },
      ip: '127.0.0.1',
      headers: {},
    };

    await expect(
      controller.login(
        { email: 'user@example.com', password: 'password' },
        request as never,
        {} as never,
      ),
    ).resolves.toMatchObject({ message: 'Login successful' });

    expect(regenerate).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    expect(request.session).toMatchObject({
      adminId: 'a1',
      adminEmail: 'user@example.com',
      sessionVersion: 2,
    });
    expect(regenerate.mock.invocationCallOrder[0]).toBeLessThan(
      save.mock.invocationCallOrder[0],
    );
  });

  it('returns the authenticated admin from /me', () => {
    const controller = new AuthController(
      {} as never,
      {} as never,
      {} as never,
    );
    const admin = { id: 'a1', email: 'user@example.com' };
    expect(controller.me({ admin } as never)).toEqual({ admin });
  });

  it('destroys the session and returns a logout response', async () => {
    const destroy = vi.fn((callback: (error: Error | null) => void) =>
      callback(null),
    );
    const audit = vi.fn().mockResolvedValue(undefined);
    const controller = new AuthController(
      {} as never,
      { getOrThrow: () => 'sid' } as never,
      { log: audit } as never,
    );
    const reply = { clearCookie: vi.fn() };
    await expect(
      controller.logout(
        {
          session: { destroy },
          admin: { id: 'a1' },
          ip: '127.0.0.1',
          headers: {},
        } as never,
        reply as never,
      ),
    ).resolves.toEqual({ message: 'Logout successful' });
    expect(destroy).toHaveBeenCalled();
    expect(reply.clearCookie).toHaveBeenCalledWith('sid', { path: '/' });
  });
});
