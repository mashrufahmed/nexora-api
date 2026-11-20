import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';

function service(overrides: Record<string, unknown> = {}) {
  const prisma = { adminUser: { findUnique: vi.fn(), update: vi.fn() } };
  const attempts = { isLocked: vi.fn().mockResolvedValue(false), recordFailedAttempt: vi.fn(), resetAttempts: vi.fn() };
  const redis = { getClient: vi.fn() };
  const mail = { sendMail: vi.fn() };
  const config = { getOrThrow: vi.fn().mockReturnValue('otp-secret'), get: vi.fn((_key: string, fallback?: unknown) => fallback) };
  const audit = { log: vi.fn() };
  const instance = new AuthService(prisma as never, attempts as never, redis as never, mail as never, config as never, audit as never);
  return { instance, prisma, attempts, redis, mail, audit, ...overrides };
}

describe('AuthService', () => {
  it('rejects a locked account before database lookup', async () => {
    const ctx = service(); ctx.attempts.isLocked.mockResolvedValue(true);
    await expect(ctx.instance.validateAdmin('User@Example.com', 'password')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.prisma.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an unverified admin after valid password', async () => {
    const ctx = service(); ctx.prisma.adminUser.findUnique.mockResolvedValue({ id: 'a1', email: 'user@example.com', password: await argon2.hash('password'), emailVerifiedAt: null, status: 'ACTIVE' });
    await expect(ctx.instance.validateAdmin('USER@example.com', 'password')).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.attempts.resetAttempts).toHaveBeenCalledWith('user@example.com');
  });

  it('returns an active verified admin after valid password', async () => {
    const admin = { id: 'a1', email: 'user@example.com', password: await argon2.hash('password'), emailVerifiedAt: new Date(), status: 'ACTIVE', sessionVersion: 2 };
    const ctx = service(); ctx.prisma.adminUser.findUnique.mockResolvedValue(admin);
    await expect(ctx.instance.validateAdmin('USER@example.com', 'password')).resolves.toBe(admin);
  });

  it('rejects an invalid password and records the failed attempt', async () => {
    const ctx = service(); ctx.prisma.adminUser.findUnique.mockResolvedValue({ id: 'a1', password: await argon2.hash('correct') });
    await expect(ctx.instance.validateAdmin('user@example.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.attempts.recordFailedAttempt).toHaveBeenCalledWith('user@example.com');
  });

  it('rejects changing to the same password', async () => {
    await expect(ctxChange().instance.changePassword('a1', { currentPassword: 'same', newPassword: 'same' })).rejects.toThrow('must differ');
  });

  it('rejects a wrong current password', async () => {
    const ctx = ctxChange(); ctx.prisma.adminUser.findUnique.mockResolvedValue({ id: 'a1', password: await argon2.hash('correct') });
    await expect(ctx.instance.changePassword('a1', { currentPassword: 'wrong', newPassword: 'new-password' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a missing reset token', async () => {
    const ctx = service();
    ctx.redis.getClient.mockReturnValue({ get: vi.fn().mockResolvedValue(null) });
    await expect(ctx.instance.resetPassword({ email: 'user@example.com', token: 'a'.repeat(32), password: 'new-password' })).rejects.toThrow('Invalid or expired reset token');
  });

  it('resets a password, invalidates sessions, and consumes the token', async () => {
    const token = 'a'.repeat(32);
    const ctx = service();
    const hashResetToken = (ctx.instance as unknown as { hashResetToken(value: string): string }).hashResetToken(token);
    const raw = JSON.stringify({ tokenHash: hashResetToken, adminId: 'a1' });
    ctx.redis.getClient.mockReturnValue({ get: vi.fn().mockResolvedValue(raw), del: vi.fn().mockResolvedValue(1) });
    ctx.prisma.adminUser.findUnique.mockResolvedValue({ id: 'a1', email: 'user@example.com' });
    ctx.prisma.adminUser.update.mockResolvedValue({ id: 'a1' });
    await expect(ctx.instance.resetPassword({ email: 'USER@example.com', token, password: 'new-password' })).resolves.toEqual({ message: 'Password reset successfully. Please login again.' });
    expect(ctx.prisma.adminUser.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'a1' }, data: expect.objectContaining({ sessionVersion: { increment: 1 } }) }));
    expect(ctx.audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'ADMIN_PASSWORD_RESET', entityId: 'a1' }));
  });

  it('changes a password and invalidates sessions after verifying the current password', async () => {
    const ctx = service();
    ctx.prisma.adminUser.findUnique.mockResolvedValue({ id: 'a1', password: await argon2.hash('current-password') });
    ctx.prisma.adminUser.update.mockResolvedValue({ id: 'a1' });
    await expect(ctx.instance.changePassword('a1', { currentPassword: 'current-password', newPassword: 'new-password' })).resolves.toBeUndefined();
    expect(ctx.prisma.adminUser.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sessionVersion: { increment: 1 } }) }));
  });
});

function ctxChange() { return service(); }