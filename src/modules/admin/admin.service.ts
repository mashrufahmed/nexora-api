import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { EmailVerificationService } from './email-verification/email-verification.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async create(dto: CreateAdminDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Admin email already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    let admin;

    try {
      admin = await this.prisma.adminUser.create({
        data: {
          name: dto.name.trim(),
          email,
          password: passwordHash,
          status: 'INACTIVE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Admin email already exists');
      }

      throw error;
    }

    await this.emailVerification.sendOtp(admin.id);

    return {
      ...admin,
      emailVerificationRequired: true,
    };
  }
}
