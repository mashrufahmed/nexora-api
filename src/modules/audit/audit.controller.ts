import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { AuditService } from './audit.service.js';
import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';
import { IdParamDto } from '../../common/dto/resource-params.dto.js';

@Controller('audit')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('audit.logs.read')
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @Permissions('audit.logs.read')
  async findOne(@Param() params: IdParamDto) {
    const log = await this.auditService.findOne(params.id);

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log;
  }
}
