import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    token?: string,
  ) {
    const raw = token ?? randomBytes(32).toString('hex');
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
      where: { entityType, entityId, status: 'PENDING' },
    });
    if (!record)
      throw new BadRequestException('Verification token expired or invalid');
    if (record.attempts >= 5) {
      await this.prisma.verification.update({ where: { id: record.id }, data: { status: 'FAILED' } });
      throw new HttpException('Verification attempts exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (record.expiresAt <= new Date()) {
      await this.prisma.verification.update({
        where: { id: record.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Verification token expired or invalid');
    }
    const attempt = await this.prisma.verification.updateMany({
      where: { id: record.id, status: 'PENDING', attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    });
    if (!attempt.count)
      throw new HttpException('Verification attempts exceeded', HttpStatus.TOO_MANY_REQUESTS);
    if (record.tokenHash !== hash) {
      const attempts = record.attempts + 1;
      if (attempts >= 5)
        await this.prisma.verification.update({ where: { id: record.id }, data: { status: 'FAILED' } });
      throw new BadRequestException('Verification token expired or invalid');
    }
    const updated = await this.prisma.verification.updateMany({
      where: { id: record.id, status: 'PENDING' },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
    if (!updated.count)
      throw new BadRequestException('Verification token already used');
    return true;
  }
}
