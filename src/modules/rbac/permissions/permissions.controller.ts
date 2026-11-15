import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminAuthGuard } from '../../admin/guards/admin-auth.guard.js';
import { Permissions } from '../decorators/permissions.decorator.js';
import { CreatePermissionDto } from '../dto/create-permission.dto.js';
import { UpdatePermissionDto } from '../dto/update-permission.dto.js';
import { PermissionGuard } from '../guards/permission.guard.js';
import { PermissionsService } from './permissions.service.js';

@Controller('rbac/permissions')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @Permissions('rbac.permissions.create')
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Get()
  @Permissions('rbac.permissions.read')
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('module') module?: string,
  ) {
    return this.permissionsService.findAll(
      Number(page),
      Number(limit),
      search,
      module,
    );
  }

  @Get(':id')
  @Permissions('rbac.permissions.read')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('rbac.permissions.update')
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('rbac.permissions.delete')
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
