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
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuthService } from './auth.service.js';

@Controller('admin/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: seconds(60),
    },
  })
  async login(@Body() dto: LoginAdminDto, @Req() request: FastifyRequest) {
    const admin = await this.authService.validateAdmin(dto.email, dto.password);

    try {
      // Prevent session fixation.
      await request.session.regenerate();

      request.session.adminId = admin.id;
      request.session.adminEmail = admin.email;
      request.session.sessionVersion = admin.sessionVersion;

      // Update login timestamp before saving session.
      await this.authService.updateLastLogin(admin.id);

      // Persist session.
      await request.session.save();
      await this.writeAuthAudit({
        actorAdminId: admin.id,
        action: 'ADMIN_LOGIN_SUCCESS',
        entityType: 'admin_auth',
        entityId: admin.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      });
    } catch (error) {
      // Best-effort cleanup of a partially created session.
      try {
        await request.session.destroy();
      } catch {
        // Preserve the original login error.
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

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@Req() request: FastifyRequest) {
    return {
      admin: request.admin,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      await request.session.destroy();
    } finally {
      reply.clearCookie(this.config.getOrThrow<string>('SESSION_COOKIE_NAME'), {
        path: '/',
      });
    }
    await this.writeAuthAudit({
      actorAdminId: request.admin!.id,
      action: 'ADMIN_LOGOUT',
      entityType: 'admin_auth',
      entityId: request.admin!.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });
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
