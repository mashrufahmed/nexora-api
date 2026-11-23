import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../../admin/guards/admin-auth.guard.js';
import { Permissions } from '../decorators/permissions.decorator.js';
import { CreateRoleDto } from '../dto/create-role.dto.js';
import { UpdateRoleDto } from '../dto/update-role.dto.js';
import { RbacListQueryDto } from '../dto/rbac-list-query.dto.js';
import { PermissionGuard } from '../guards/permission.guard.js';
import { RolesService } from './roles.service.js';
import { IdParamDto } from '../../../common/dto/resource-params.dto.js';

@Controller('rbac/roles')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions('rbac.roles.create')
  create(@Body() dto: CreateRoleDto, @Req() request: FastifyRequest) {
    return this.rolesService.create(dto, {
      actorAdminId: request.admin!.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Get()
  @Permissions('rbac.roles.read')
  findAll(@Query() query: RbacListQueryDto) {
    return this.rolesService.findAll(query.page, query.limit, query.search);
  }

  @Get(':id')
  @Permissions('rbac.roles.read')
  findOne(@Param() params: IdParamDto) {
    return this.rolesService.findOne(params.id);
  }

  @Patch(':id')
  @Permissions('rbac.roles.update')
  update(@Param() params: IdParamDto, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(params.id, dto);
  }

  @Delete(':id')
  @Permissions('rbac.roles.delete')
  remove(@Param() params: IdParamDto) {
    return this.rolesService.remove(params.id);
  }
}
