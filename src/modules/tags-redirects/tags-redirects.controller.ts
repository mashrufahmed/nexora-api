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
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import {
  RedirectDto,
  TagDto,
  UpdateRedirectDto,
  UpdateTagDto,
} from './dto/tags-redirects.dto.js';
import { SiteIdQueryDto } from '../site-access/dto/site-id-query.dto.js';
import { RedirectResolveQueryDto } from './dto/redirect-resolve-query.dto.js';
import { TagsRedirectsService } from './tags-redirects.service.js';
import { IdParamDto } from '../../common/dto/resource-params.dto.js';
@Controller()
export class TagsRedirectsController {
  constructor(private readonly service: TagsRedirectsService) {}
  @Post('tags')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('tag.manage')
  tag(@Body() d: TagDto, @Req() r: FastifyRequest) {
    return this.service.tag(d, r.admin!.id);
  }
  @Get('tags')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('tag.manage')
  listTags(@Query() query: SiteIdQueryDto, @Req() r: FastifyRequest) {
    return this.service.listTags(query.siteId, r.admin!.id);
  }
  @Patch('tags/:id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('tag.manage')
  updateTag(
    @Param() params: IdParamDto,
    @Body() d: UpdateTagDto,
    @Req() r: FastifyRequest,
  ) {
    return this.service.updateTag(params.id, d, r.admin!.id);
  }
  @Delete('tags/:id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('tag.manage')
  deleteTag(@Param() params: IdParamDto, @Req() r: FastifyRequest) {
    return this.service.deleteTag(params.id, r.admin!.id);
  }
  @Post('site-content/:id/tags')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('tag.manage')
  assign(
    @Param() params: IdParamDto,
    @Body('tagIds') ids: string[],
    @Req() r: FastifyRequest,
  ) {
    return this.service.assign(params.id, ids, r.admin!.id);
  }
  @Post('redirects')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('redirect.manage')
  redirect(@Body() d: RedirectDto, @Req() r: FastifyRequest) {
    return this.service.redirect(d, r.admin!.id);
  }
  @Get('redirects')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('redirect.manage')
  listRedirects(@Query() query: SiteIdQueryDto, @Req() r: FastifyRequest) {
    return this.service.listRedirects(query.siteId, r.admin!.id);
  }
  @Patch('redirects/:id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('redirect.manage')
  updateRedirect(
    @Param() params: IdParamDto,
    @Body() d: UpdateRedirectDto,
    @Req() r: FastifyRequest,
  ) {
    return this.service.updateRedirect(params.id, d, r.admin!.id);
  }
  @Delete('redirects/:id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('redirect.manage')
  deleteRedirect(@Param() params: IdParamDto, @Req() r: FastifyRequest) {
    return this.service.deleteRedirect(params.id, r.admin!.id);
  }
  @Get('redirects/resolve') resolve(@Query() query: RedirectResolveQueryDto) {
    return this.service.resolve(query.siteId, query.path);
  }
}
