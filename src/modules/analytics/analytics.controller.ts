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
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Post('events') record(@Body() d: AnalyticsEventDto) {
    return this.analytics.record(d);
  }
  @Get('summary')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  summary(@Query() query: AnalyticsQueryDto, @Req() r: FastifyRequest) {
    return this.analytics.summary(query.siteId, r.admin!.id);
  }
  @Get('report')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  report(
    @Query() query: AnalyticsQueryDto,
    @Req() r: FastifyRequest,
  ) {
    return this.analytics.report(query.siteId, r.admin!.id, query.from, query.to);
  }
}
