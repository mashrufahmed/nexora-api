import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AssignmentsController } from './assignments/assignments.controller.js';
import { AssignmentsService } from './assignments/assignments.service.js';
import { PermissionGuard } from './guards/permission.guard.js';
import { PermissionsController } from './permissions/permissions.controller.js';
import { PermissionsService } from './permissions/permissions.service.js';
import { RolesController } from './roles/roles.controller.js';
import { RolesService } from './roles/roles.service.js';
import { SuperAdminProtectionService } from './security/super-admin-protection.service.js';

@Global()
@Module({
  imports: [AuditModule],
  controllers: [RolesController, PermissionsController, AssignmentsController],
  providers: [
    RolesService,
    PermissionsService,
    AssignmentsService,
    PermissionGuard,
    SuperAdminProtectionService,
  ],
  exports: [
    RolesService,
    PermissionsService,
    AssignmentsService,
    PermissionGuard,
  ],
})
export class RbacModule {}
