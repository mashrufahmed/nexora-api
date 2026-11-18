import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsEventDto } from './dto/analytics.dto.js';
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Post('events') record(@Body() d: AnalyticsEventDto) {
    return this.analytics.record(d);
  }
  @Get('summary')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  summary(@Query('siteId') s: string, @Req() r: FastifyRequest) {
    return this.analytics.summary(s, r.admin!.id);
  }
  @Get('report')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  report(
    @Query('siteId') s: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Req() r: FastifyRequest,
  ) {
    return this.analytics.report(s, r.admin!.id, from, to);
  }
}
