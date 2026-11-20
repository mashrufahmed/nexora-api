import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  it('returns the authenticated admin from /me', () => {
    const controller = new AuthController({} as never, {} as never, {} as never);
    const admin = { id: 'a1', email: 'user@example.com' };
    expect(controller.me({ admin } as never)).toEqual({ admin });
  });

  it('destroys the session and returns a logout response', async () => {
    const destroy = vi.fn((callback: (error: Error | null) => void) => callback(null));
    const audit = vi.fn().mockResolvedValue(undefined);
    const controller = new AuthController({} as never, { getOrThrow: () => 'sid' } as never, { log: audit } as never);
    const reply = { clearCookie: vi.fn() };
    await expect(controller.logout({ session: { destroy }, admin: { id: 'a1' }, ip: '127.0.0.1', headers: {} } as never, reply as never)).resolves.toEqual({ message: 'Logout successful' });
    expect(destroy).toHaveBeenCalled();
    expect(reply.clearCookie).toHaveBeenCalledWith('sid', { path: '/' });
  });
});