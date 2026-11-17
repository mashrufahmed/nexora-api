import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { ScheduleContentDto } from './dto/schedule-content.dto.js';
import { PublishingService } from './publishing.service.js';

@Controller()
@UseGuards(AdminAuthGuard, PermissionGuard)
export class PublishingController {
  constructor(private readonly publishing: PublishingService) {}
  @Post('content/:id/schedule') @Permissions('content.publish') schedule(
    @Param('id') id: string,
    @Body() dto: ScheduleContentDto,
    @Req() r: FastifyRequest,
  ) {
    return this.publishing.scheduleContent(
      id,
      dto.siteId,
      dto.scheduledAt,
      r.admin!.id,
    );
  }
  @Post('publishing/publish-due') @Permissions('content.publish') publishDue() {
    return this.publishing.publishDue();
  }
}
