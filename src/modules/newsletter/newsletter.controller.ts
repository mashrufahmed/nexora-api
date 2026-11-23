import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { SubscribeDto, VerifySubscriberDto } from './dto/newsletter.dto.js';
import { NewsletterListQueryDto } from './dto/newsletter-list-query.dto.js';
import { NewsletterService } from './newsletter.service.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { IdParamDto } from '../../common/dto/resource-params.dto.js';
@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}
  @Post('subscribe')
  @Throttle({ default: { limit: 3, ttl: seconds(300) } })
  @ApiOperation({ summary: 'Subscribe an email address to a site newsletter' })
  subscribe(@Body() d: SubscribeDto) {
    return this.service.subscribe(d);
  }
  @Post(':id/verify')
  @Throttle({ default: { limit: 5, ttl: seconds(300) } })
  verify(@Param() params: IdParamDto, @Body() d: VerifySubscriberDto) {
    return this.service.verify(params.id, d.token);
  }
  @Post(':id/unsubscribe')
  @Throttle({ default: { limit: 5, ttl: seconds(300) } })
  unsubscribe(@Param() params: IdParamDto, @Body() d: VerifySubscriberDto) {
    return this.service.unsubscribe(params.id, d.token);
  }
  @Get()
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('newsletter.manage')
  list(@Query() query: NewsletterListQueryDto, @Req() r: FastifyRequest) {
    return this.service.list(query, r.admin!.id);
  }
}
