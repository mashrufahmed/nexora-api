import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LoginAttemptService } from './login-attempt.service.js';

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthService, AdminAuthGuard, LoginAttemptService],
  exports: [AuthService],
})
export class AuthModule {}
