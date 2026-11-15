import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AssignAdminRolesDto } from '../dto/assign-admin-role.dto.js';
import { AssignRolePermissionsDto } from '../dto/assign-role-permissions.dto.js';
import { AssignmentsService } from './assignments.service.js';
import { AdminAuthGuard } from '../../admin/guards/admin-auth.guard.js';
import { Permissions } from '../decorators/permissions.decorator.js';
import { PermissionGuard } from '../guards/permission.guard.js';

@Controller('rbac')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // Role Permission Assignment
  @Post('roles/:roleId/permissions')
  @Permissions('rbac.roles.assign_permissions')
  assignPermissions(
    @Param('roleId') roleId: string,
    @Body() dto: AssignRolePermissionsDto,
  ) {
    return this.assignmentsService.assignPermissions(roleId, dto.permissionIds);
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @Permissions('rbac.roles.assign_permissions')
  removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.assignmentsService.removePermission(roleId, permissionId);
  }

  // Admin Role Assignment
  @Post('admins/:adminId/roles')
  @Permissions('rbac.admins.assign_roles')
  assignRoles(
    @Param('adminId') adminId: string,
    @Body() dto: AssignAdminRolesDto,
  ) {
    return this.assignmentsService.assignRoles(adminId, dto.roleIds);
  }

  @Delete('admins/:adminId/roles/:roleId')
  @Permissions('rbac.admins.assign_roles')
  removeRole(
    @Param('adminId') adminId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.assignmentsService.removeRole(adminId, roleId);
  }

  // Admin effective access
  @Get('admins/:adminId/access')
  @Permissions('rbac.admins.read')
  getAdminAccess(@Param('adminId') adminId: string) {
    return this.assignmentsService.getAdminAccess(adminId);
  }
}
