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
import { RbacListQueryDto } from '../dto/rbac-list-query.dto.js';
import { PermissionGuard } from '../guards/permission.guard.js';
import { PermissionsService } from './permissions.service.js';
import { IdParamDto } from '../../../common/dto/resource-params.dto.js';

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
  findAll(@Query() query: RbacListQueryDto) {
    return this.permissionsService.findAll(
      query.page,
      query.limit,
      query.search,
      query.module,
    );
  }

  @Get(':id')
  @Permissions('rbac.permissions.read')
  findOne(@Param() params: IdParamDto) {
    return this.permissionsService.findOne(params.id);
  }

  @Patch(':id')
  @Permissions('rbac.permissions.update')
  update(@Param() params: IdParamDto, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(params.id, dto);
  }

  @Delete(':id')
  @Permissions('rbac.permissions.delete')
  remove(@Param() params: IdParamDto) {
    return this.permissionsService.remove(params.id);
  }
}
