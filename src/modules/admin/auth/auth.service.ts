import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../../../database/prisma.service.js';
import { LoginAttemptService } from './login-attempt.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loginAttemptService: LoginAttemptService,
  ) {}

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
    const passwordValid =
      admin && (await argon2.verify(admin.password, password));

    if (!passwordValid) {
      await this.loginAttemptService.recordFailedAttempt(normalizedEmail);

      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Successful password -> reset attempts
    await this.loginAttemptService.resetAttempts(normalizedEmail);

    // 5. Verify email
    if (!admin.emailVerifiedAt) {
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
