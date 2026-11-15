import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoginAdminDto } from '../dto/login-admin.dto.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuthService } from './auth.service.js';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

    // Prevent session fixation.
    await request.session.regenerate();

    request.session.adminId = admin.id;
    request.session.adminEmail = admin.email;
    request.session.sessionVersion = admin.sessionVersion;

    // Persist session before returning success.
    await request.session.save();
    await this.authService.updateLastLogin(admin.id);

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
    await request.session.destroy();
    reply.clearCookie('nexora_admin_sid', {
      path: '/',
    });
    return {
      message: 'Logout successful',
    };
  }
}
