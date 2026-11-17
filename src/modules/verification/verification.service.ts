import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}
  async issue(
    entityType: string,
    entityId: string,
    identifier: string,
    method = 'email',
    ttlSeconds = 900,
  ) {
    const raw = randomBytes(32).toString('hex');
    await this.prisma.verification.updateMany({
      where: { entityType, entityId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    await this.prisma.verification.create({
      data: {
        entityType,
        entityId,
        identifier: identifier.trim().toLowerCase(),
        method,
        tokenHash: createHash('sha256').update(raw).digest('hex'),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    return raw;
  }
  async verify(entityType: string, entityId: string, raw: string) {
    const hash = createHash('sha256').update(raw).digest('hex');
    const record = await this.prisma.verification.findFirst({
      where: { entityType, entityId, tokenHash: hash, status: 'PENDING' },
    });
    if (!record)
      throw new BadRequestException('Verification token expired or invalid');
    if (record.expiresAt <= new Date()) {
      await this.prisma.verification.update({
        where: { id: record.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Verification token expired or invalid');
    }
    if (record.attempts >= 5) {
      await this.prisma.verification.update({
        where: { id: record.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException('Verification attempts exceeded');
    }
    const updated = await this.prisma.verification.updateMany({
      where: { id: record.id, status: 'PENDING', tokenHash: hash },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (!updated.count)
      throw new BadRequestException('Verification token already used');
    return true;
  }
}
