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
import { PermissionGuard } from '../guards/permission.guard.js';
import { RolesService } from './roles.service.js';

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
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    return this.rolesService.findAll(Number(page), Number(limit), search);
  }

  @Get(':id')
  @Permissions('rbac.roles.read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('rbac.roles.update')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('rbac.roles.delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
