import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, seconds } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditService } from '../../audit/audit.service.js';
import { LoginAdminDto } from '../dto/login-admin.dto.js';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuthService } from './auth.service.js';
import {
  destroySession,
  saveSession,
} from './session-lifecycle.js';

@Controller('admin/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  @Get('csrf')
  csrf(@Res({ passthrough: true }) reply: FastifyReply) {
    return { token: reply.generateCsrf() };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: seconds(60),
    },
  })
  async login(
    @Body() dto: LoginAdminDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const admin = await this.authService.validateAdmin(dto.email, dto.password);

    try {
      // Persist authenticated state on the current server-side session.
      // The login page may already have an anonymous session from /me, and
      // regenerating that Redis-backed session can fail on its generation.
      request.session.adminId = admin.id;
      request.session.adminEmail = admin.email;
      request.session.sessionVersion = admin.sessionVersion;
      await saveSession(request);

      // Update login timestamp before saving session.
      await this.authService.updateLastLogin(admin.id);

      await this.writeAuthAudit({
        actorAdminId: admin.id,
        action: 'ADMIN_LOGIN_SUCCESS',
        entityType: 'admin_auth',
        entityId: admin.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      });
    } catch (error) {
      this.logger.error(
        'Admin login session setup failed',
        error instanceof Error ? error.stack : String(error),
      );
      try {
        await request.session.destroy();
      } catch {
        // Preserve original error.
      } finally {
        reply.clearCookie(
          this.config.getOrThrow<string>('SESSION_COOKIE_NAME'),
          { path: '/' },
        );
      }

      throw error;
    }

    return {
      message: 'Login successful',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
        lastLoginAt: new Date(),
      },
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 3,
      ttl: seconds(60),
    },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: seconds(60),
    },
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@Req() request: FastifyRequest) {
    return {
      admin: request.admin,
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  @Throttle({
    default: {
      limit: 5,
      ttl: seconds(60),
    },
  })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.changePassword(request.admin!.id, dto);
    await destroySession(request);
    reply.clearCookie(this.config.getOrThrow<string>('SESSION_COOKIE_NAME'), {
      path: '/',
    });

    await this.writeAuthAudit({
      actorAdminId: request.admin!.id,
      action: 'ADMIN_PASSWORD_CHANGED',
      entityType: 'admin_auth',
      entityId: request.admin!.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });

    return { message: 'Password changed successfully. Please login again.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      await destroySession(request);
      await this.writeAuthAudit({
        actorAdminId: request.admin!.id,
        action: 'ADMIN_LOGOUT',
        entityType: 'admin_auth',
        entityId: request.admin!.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      });
    } finally {
      reply.clearCookie(this.config.getOrThrow<string>('SESSION_COOKIE_NAME'), {
        path: '/',
      });
    }

    return {
      message: 'Logout successful',
    };
  }

  private async writeAuthAudit(
    input: Parameters<AuditService['log']>[0],
  ): Promise<void> {
    try {
      await this.auditService.log(input);
    } catch (error) {
      this.logger.error(
        'Auth audit logging failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
