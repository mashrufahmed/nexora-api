import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service.js';
import { LoginAttemptService } from './login-attempt.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { MailService } from '../../../mail/mail.service.js';
import { AuditService } from '../../audit/audit.service.js';
import type { ResetPasswordDto } from '../dto/reset-password.dto.js';
import type { ChangePasswordDto } from '../dto/change-password.dto.js';

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = argon2.hash(
    'nexora-dummy-password-verification',
  );
  constructor(
    private readonly prisma: PrismaService,
    private readonly loginAttemptService: LoginAttemptService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private readonly resetPrefix = 'nexora:admin:password-reset:';
  private readonly resetRatePrefix = 'nexora:admin:password-reset-rate:';

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private resetKey(email: string): string {
    return `${this.resetPrefix}${this.normalizeEmail(email)}`;
  }

  private resetRateKey(email: string): string {
    return `${this.resetRatePrefix}${this.normalizeEmail(email)}`;
  }

  private hashResetToken(token: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('OTP_SECRET'))
      .update(token)
      .digest('hex');
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    })[character] ?? character);
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(email);
    const client = this.redis.getClient();
    const rateKey = this.resetRateKey(normalizedEmail);
    const rateCount = await client.incr(rateKey);

    if (rateCount === 1) {
      await client.expire(
        rateKey,
        this.config.get<number>('ADMIN_PASSWORD_RESET_REQUEST_TTL', 900),
      );
    }

    const genericResponse = {
      message: 'If an account exists for this email, a reset link has been sent.',
    };

    if (
      rateCount >
      this.config.get<number>('ADMIN_PASSWORD_RESET_MAX_REQUESTS', 3)
    ) {
      return genericResponse;
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });

    if (!admin) return genericResponse;

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashResetToken(token);
    await client.set(
      this.resetKey(normalizedEmail),
      JSON.stringify({ tokenHash, adminId: admin.id }),
      'EX',
      this.config.get<number>('ADMIN_PASSWORD_RESET_TTL', 900),
    );

    const resetUrl = new URL(
      this.config.get<string>(
        'ADMIN_PASSWORD_RESET_URL',
        'http://localhost:3000/auth/reset-password',
      ),
    );
    resetUrl.searchParams.set('email', admin.email);
    resetUrl.searchParams.set('token', token);

    await this.mail.sendMail({
      to: admin.email,
      subject: 'Reset your Nexora admin password',
      html: `<div style="font-family:Arial,sans-serif"><p>Hello ${this.escapeHtml(admin.name)},</p><p>Use the following link to reset your password. It expires soon and can only be used once:</p><p><a href="${this.escapeHtml(resetUrl.toString())}">Reset password</a></p></div>`,
    });

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const key = this.resetKey(normalizedEmail);
    const tokenHash = this.hashResetToken(dto.token);
    const client = this.redis.getClient();
    const raw = await client.get(key);

    if (!raw) throw new BadRequestException('Invalid or expired reset token');

    let stored: { tokenHash?: string; adminId?: string };
    try {
      stored = JSON.parse(raw) as { tokenHash?: string; adminId?: string };
    } catch {
      await client.del(key);
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (stored.tokenHash !== tokenHash || !stored.adminId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: stored.adminId },
      select: { id: true, email: true },
    });

    if (!admin || admin.email !== normalizedEmail) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        password: await argon2.hash(dto.password, { type: argon2.argon2id }),
        sessionVersion: { increment: 1 },
      },
    });
    await client.del(key);
    await this.audit.log({
      action: 'ADMIN_PASSWORD_RESET',
      entityType: 'admin_auth',
      entityId: admin.id,
    });

    return { message: 'Password reset successfully. Please login again.' };
  }

  async changePassword(
    adminId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, password: true },
    });

    if (!admin || !(await argon2.verify(admin.password, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        password: await argon2.hash(dto.newPassword, { type: argon2.argon2id }),
        sessionVersion: { increment: 1 },
      },
    });
  }

  async validateAdmin(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check account lock
    if (await this.loginAttemptService.isLocked(normalizedEmail)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Find admin
    const admin = await this.prisma.adminUser.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // 3. Verify password
    const hash = admin ? admin.password : await this.dummyPasswordHash;

    const passwordValid = await argon2.verify(hash, password);

    if (!passwordValid) {
      await this.loginAttemptService.recordFailedAttempt(normalizedEmail);

      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Successful password -> reset attempts
    await this.loginAttemptService.resetAttempts(normalizedEmail);

    // 5. Verify email
    if (!admin?.emailVerifiedAt) {
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }

    // 6. Verify status
    if (admin.status !== 'ACTIVE') {
      throw new ForbiddenException('Your admin account is not active');
    }

    return admin;
  }

  async updateLastLogin(adminId: string): Promise<void> {
    await this.prisma.adminUser.update({
      where: {
        id: adminId,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }
}
