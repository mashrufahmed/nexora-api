import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../../database/prisma.service.js';
import { AuthService } from './auth.service.js';
import { LoginAttemptService } from './login-attempt.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    adminUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const loginAttemptMock = {
    isLocked: vi.fn(),
    recordFailedAttempt: vi.fn(),
    resetAttempts: vi.fn(),
  };

  const adminMock = {
    id: 'admin_123',
    name: 'Test Admin',
    email: 'admin@example.com',
    password: 'hashed-password',
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
    sessionVersion: 1,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: LoginAttemptService,
          useValue: loginAttemptMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    loginAttemptMock.isLocked.mockResolvedValue(false);
    loginAttemptMock.resetAttempts.mockResolvedValue(undefined);
    loginAttemptMock.recordFailedAttempt.mockResolvedValue(undefined);

    prismaMock.adminUser.findUnique.mockResolvedValue(adminMock);

    vi.spyOn(argon2, 'verify').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateAdmin', () => {
    it('should authenticate a valid admin', async () => {
      const result = await service.validateAdmin(
        'ADMIN@example.com',
        'correct-password',
      );

      expect(result).toEqual(adminMock);

      expect(prismaMock.adminUser.findUnique).toHaveBeenCalledWith({
        where: {
          email: 'admin@example.com',
        },
      });

      expect(loginAttemptMock.resetAttempts).toHaveBeenCalledWith(
        'admin@example.com',
      );
    });

    it('should reject login when account is locked', async () => {
      loginAttemptMock.isLocked.mockResolvedValue(true);

      await expect(
        service.validateAdmin('admin@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaMock.adminUser.findUnique).not.toHaveBeenCalled();
    });

    it('should reject invalid password', async () => {
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.validateAdmin('admin@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(loginAttemptMock.recordFailedAttempt).toHaveBeenCalledWith(
        'admin@example.com',
      );
    });

    it('should reject nonexistent admin', async () => {
      prismaMock.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.validateAdmin('unknown@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(loginAttemptMock.recordFailedAttempt).toHaveBeenCalledWith(
        'unknown@example.com',
      );
    });

    it('should reject admin with unverified email', async () => {
      prismaMock.adminUser.findUnique.mockResolvedValue({
        ...adminMock,
        emailVerifiedAt: null,
      });

      await expect(
        service.validateAdmin('admin@example.com', 'password'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject inactive admin', async () => {
      prismaMock.adminUser.findUnique.mockResolvedValue({
        ...adminMock,
        status: 'INACTIVE',
      });

      await expect(
        service.validateAdmin('admin@example.com', 'password'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject suspended admin', async () => {
      prismaMock.adminUser.findUnique.mockResolvedValue({
        ...adminMock,
        status: 'SUSPENDED',
      });

      await expect(
        service.validateAdmin('admin@example.com', 'password'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should normalize email before authentication', async () => {
      await service.validateAdmin('  ADMIN@EXAMPLE.COM  ', 'correct-password');

      expect(loginAttemptMock.isLocked).toHaveBeenCalledWith(
        'admin@example.com',
      );
    });

    it('should not reset attempts for invalid password', async () => {
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.validateAdmin('admin@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(loginAttemptMock.resetAttempts).not.toHaveBeenCalled();
    });
  });

  describe('updateLastLogin', () => {
    it('should update admin last login timestamp', async () => {
      prismaMock.adminUser.update.mockResolvedValue(adminMock);

      await service.updateLastLogin('admin_123');

      expect(prismaMock.adminUser.update).toHaveBeenCalledWith({
        where: {
          id: 'admin_123',
        },
        data: {
          lastLoginAt: expect.any(Date),
        },
      });
    });
  });
});
