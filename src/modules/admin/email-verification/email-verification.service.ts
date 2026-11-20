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

import { randomInt } from 'node:crypto';

import { OTP_LENGTH } from './email-verification.constants.js';
const OTP_COOLDOWN_PREFIX = 'nexora:admin:otp:cooldown';

import { PrismaService } from '../../../database/prisma.service.js';
import { MailService } from '../../../mail/mail.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { VerificationService } from '../../verification/verification.service.js';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly verification: VerificationService,
  ) {}

  private get otpExpiresIn(): number {
    return this.config.get<number>('OTP_EXPIRES_IN', 300);
  }

  private get resendCooldown(): number {
    return this.config.get<number>('OTP_RESEND_COOLDOWN', 60);
  }

  private generateOtp(): string {
    return randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();
  }

  private getCooldownKey(adminId: string): string {
    return `${OTP_COOLDOWN_PREFIX}:${adminId}`;
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
    try {
      await this.verification.issue('admin_email', admin.id, admin.email, 'otp', this.otpExpiresIn, otp);

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
      await client.del(cooldownKey);

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

    await this.verification.verify('admin_email', adminId, otp);

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { emailVerifiedAt: new Date() },
      select: { id: true },
    });

    await this.redis.getClient().del(this.getCooldownKey(adminId));
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
