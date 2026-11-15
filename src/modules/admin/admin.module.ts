import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SuperAdminProtectionService } from '../rbac/security/super-admin-protection.service.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AuthModule } from './auth/auth.module.js';
import { EmailVerificationModule } from './email-verification/email-verification.module.js';
import { AdminBootstrapGuard } from './guards/admin-bootstrap.guard.js';
import { AdminManagementController } from './management/admin-management.controller.js';
import { AdminManagementService } from './management/admin-management.service.js';

@Module({
  imports: [AuthModule, EmailVerificationModule, AuditModule],
  controllers: [AdminController, AdminManagementController],
  providers: [
    AdminService,
    AdminBootstrapGuard,
    AdminManagementService,
    SuperAdminProtectionService,
  ],
})
export class AdminModule {}
