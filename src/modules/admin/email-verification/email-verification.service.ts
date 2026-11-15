import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createHmac, randomInt } from 'node:crypto';

import {
  OTP_COOLDOWN_PREFIX,
  OTP_LENGTH,
  OTP_REDIS_PREFIX,
} from './email-verification.constants.js';

import { PrismaService } from '../../../database/prisma.service.js';
import { MailService } from '../../../mail/mail.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { VERIFY_OTP_SCRIPT } from './email-verification.scripts.js';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private get otpSecret(): string {
    return this.config.getOrThrow<string>('OTP_SECRET');
  }

  private get otpExpiresIn(): number {
    return this.config.get<number>('OTP_EXPIRES_IN', 300);
  }

  private get resendCooldown(): number {
    return this.config.get<number>('OTP_RESEND_COOLDOWN', 60);
  }

  private get maxAttempts(): number {
    return this.config.get<number>('OTP_MAX_ATTEMPTS', 5);
  }

  private getOtpKey(adminId: string): string {
    return `${OTP_REDIS_PREFIX}:${adminId}`;
  }

  private getCooldownKey(adminId: string): string {
    return `${OTP_COOLDOWN_PREFIX}:${adminId}`;
  }

  private generateOtp(): string {
    return randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();
  }

  private hashOtp(otp: string): string {
    return createHmac('sha256', this.otpSecret).update(otp).digest('hex');
  }

  async sendOtp(adminId: string): Promise<void> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.emailVerifiedAt) {
      throw new ConflictException('Email already verified');
    }

    const client = this.redis.getClient();
    const cooldownKey = this.getCooldownKey(adminId);
    const otpKey = this.getOtpKey(adminId);

    const cooldown = await client.set(
      cooldownKey,
      '1',
      'EX',
      this.resendCooldown,
      'NX',
    );

    if (!cooldown) {
      throw new HttpException(
        'Please wait before requesting another OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.generateOtp();
    const hash = this.hashOtp(otp);

    try {
      await client.set(
        otpKey,
        JSON.stringify({ hash, attempts: 0 }),
        'EX',
        this.otpExpiresIn,
      );

      await this.mail.sendMail({
        to: admin.email,
        subject: 'Verify your Nexora admin email',
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Email Verification</h2>
            <p>Hello ${admin.name},</p>
            <p>Your Nexora verification code is:</p>
            <h1 style="letter-spacing:8px">${otp}</h1>
            <p>This code expires in ${Math.floor(
              this.otpExpiresIn / 60,
            )} minutes.</p>
            <p>If you did not request this, ignore this email.</p>
          </div>
        `,
      });
    } catch {
      await client.del(otpKey, cooldownKey);

      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }
  }

  async verifyOtp(adminId: string, otp: string): Promise<void> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, emailVerifiedAt: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.emailVerifiedAt) {
      throw new ConflictException('Email already verified');
    }

    const client = this.redis.getClient();

    const result = Number(
      await client.eval(
        VERIFY_OTP_SCRIPT,
        1,
        this.getOtpKey(adminId),
        this.hashOtp(otp),
        this.maxAttempts,
      ),
    );

    if (result === -1) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (result === -2) {
      throw new HttpException(
        'Maximum OTP verification attempts exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (result === 0) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { emailVerifiedAt: new Date() },
      select: { id: true },
    });

    await client.del(this.getCooldownKey(adminId));
  }

  async verifyEmailOtp(email: string, otp: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    const admin = await this.prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        emailVerifiedAt: true,
      },
    });

    if (!admin) {
      throw new BadRequestException('Invalid email or verification code');
    }

    if (admin.emailVerifiedAt) {
      throw new ConflictException('Email already verified');
    }

    await this.verifyOtp(admin.id, otp);
  }

  async resendOtpByEmail(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    const admin = await this.prisma.adminUser.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        emailVerifiedAt: true,
      },
    });

    if (!admin) {
      throw new BadRequestException('Invalid email or verification request');
    }

    if (admin.emailVerifiedAt) {
      throw new ConflictException('Email already verified');
    }

    await this.sendOtp(admin.id);
  }
}
