import { BadRequestException } from '@nestjs/common';
import { VerificationService } from './verification.service.js';

describe('VerificationService', () => {
  it('issues a token and rejects an expired token', async () => {
    const prisma = { verification: { updateMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(async () => ({ id: 'v1', expiresAt: new Date(Date.now() - 1), attempts: 0 })), update: vi.fn() } } as never;
    const service = new VerificationService(prisma);
    await expect(service.issue('newsletter_subscriber', 's1', 'user@example.com')).resolves.toHaveLength(64);
    await expect(service.verify('newsletter_subscriber', 's1', 'bad-token')).rejects.toBeInstanceOf(BadRequestException);
  });
});