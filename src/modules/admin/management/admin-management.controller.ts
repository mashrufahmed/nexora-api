import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Permissions } from '../../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../../rbac/guards/permission.guard.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AdminManagementService } from './admin-management.service.js';
import { ActivateAdminDto } from './dto/activate-admin.dto.js';
import { AdminListQueryDto } from './dto/admin-list-query.dto.js';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto.js';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto.js';

@Controller('admin/management')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
  ) {}

  @Get()
  @Permissions('rbac.admins.read')
  findAll(@Query() query: AdminListQueryDto) {
    return this.adminManagementService.findAll(query);
  }

  @Get(':id')
  @Permissions('rbac.admins.read')
  findOne(@Param('id') id: string) {
    return this.adminManagementService.findOne(id);
  }

  @Patch(':id/profile')
  @Permissions('rbac.admins.update')
  updateProfile(@Param('id') id: string, @Body() dto: UpdateAdminProfileDto) {
    return this.adminManagementService.updateProfile(id, dto);
  }

  @Post(':id/activate')
  @Permissions('rbac.admins.update', 'rbac.admins.assign_roles')
  activate(@Param('id') id: string, @Body() dto: ActivateAdminDto) {
    return this.adminManagementService.activate(id, dto);
  }

  @Patch(':id/status')
  @Permissions('rbac.admins.update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdminStatusDto,
    @Req() request: FastifyRequest,
  ) {
    return this.adminManagementService.updateStatus(
      id,
      dto,
      request.session.adminId!,
    );
  }
}
