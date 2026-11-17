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
import { RedirectDto, TagDto } from './dto/tags-redirects.dto.js';
import { TagsRedirectsService } from './tags-redirects.service.js';
@Controller()
export class TagsRedirectsController {
  constructor(private readonly service: TagsRedirectsService) {}
  @Post('tags')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('tag.manage')
  tag(@Body() d: TagDto, @Req() r: FastifyRequest) {
    return this.service.tag(d, r.admin!.id);
  }
  @Post('site-content/:id/tags')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('tag.manage')
  assign(
    @Param('id') id: string,
    @Body('tagIds') ids: string[],
    @Req() r: FastifyRequest,
  ) {
    return this.service.assign(id, ids, r.admin!.id);
  }
  @Post('redirects')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('redirect.manage')
  redirect(@Body() d: RedirectDto, @Req() r: FastifyRequest) {
    return this.service.redirect(d, r.admin!.id);
  }
  @Get('redirects/resolve') resolve(
    @Query('siteId') siteId: string,
    @Query('path') path: string,
  ) {
    return this.service.resolve(siteId, path);
  }
}
