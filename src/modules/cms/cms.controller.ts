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
import { CmsService } from './cms.service.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto.js';
import { CreateContentDto } from './dto/create-content.dto.js';
import { PublishContentDto } from './dto/publish-content.dto.js';
import { UpdateContentDto } from './dto/update-content.dto.js';
import { ContentListQueryDto } from './dto/content-list-query.dto.js';
import { RequestChangesDto } from './dto/request-changes.dto.js';

@Controller()
@UseGuards(AdminAuthGuard, PermissionGuard)
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Post('content')
  @Permissions('content.create')
  create(@Body() dto: CreateContentDto, @Req() request: FastifyRequest) {
    return this.cms.createContent(dto, request.admin!.id);
  }

  @Get('content')
  @Permissions('content.read')
  list(@Query() query: ContentListQueryDto, @Req() request: FastifyRequest) {
    return this.cms.listContent(request.admin!.id, query);
  }

  @Get('content/:id')
  @Permissions('content.read')
  get(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.getContent(id, request.admin!.id);
  }

  @Get('content/:id/revisions')
  @Permissions('content.read')
  revisions(@Param('id') id: string, @Req() request: FastifyRequest) { return this.cms.listRevisions(id, request.admin!.id); }

  @Get('content/:id/revisions/:revisionId')
  @Permissions('content.read')
  revision(@Param('id') id: string, @Param('revisionId') revisionId: string, @Req() request: FastifyRequest) { return this.cms.getRevision(id, revisionId, request.admin!.id); }

  @Post('content/:id/revisions/:revisionId/restore')
  @Permissions('content.update')
  restore(@Param('id') id: string, @Param('revisionId') revisionId: string, @Req() request: FastifyRequest) { return this.cms.restoreRevision(id, revisionId, request.admin!.id); }

  @Patch('content/:id')
  @Permissions('content.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.cms.updateContent(
      id,
      dto,
      request.admin!.id,
      request.admin!.permissions,
    );
  }

  @Delete('content/:id')
  @Permissions('content.delete')
  remove(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.deleteContent(id, request.admin!.id);
  }

  @Post('content/:id/submit')
  @Permissions('content.submit')
  submit(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.transition(id, 'IN_REVIEW', request.admin!.id);
  }

  @Post('content/:id/approve')
  @Permissions('content.review')
  approve(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.transition(id, 'APPROVED', request.admin!.id);
  }

  @Post('content/:id/request-changes')
  @Permissions('content.review')
  requestChanges(@Param('id') id: string, @Body() dto: RequestChangesDto, @Req() request: FastifyRequest) {
    return this.cms.transition(id, 'DRAFT', request.admin!.id, dto.reviewNote);
  }

  @Post('content/:id/reopen')
  @Permissions('content.review')
  reopen(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.transition(id, 'DRAFT', request.admin!.id);
  }

  @Post('content/:id/archive')
  @Permissions('content.archive')
  archive(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.transition(id, 'DRAFT', request.admin!.id);
  }

  @Post('sites/:siteId/categories')
  @Permissions('category.manage')
  category(
    @Param('siteId') siteId: string,
    @Body() dto: CreateCategoryDto,
    @Req() request: FastifyRequest,
  ) {
    return this.cms.createCategory(siteId, dto, request.admin!.id);
  }

  @Get('sites/:siteId/categories')
  @Permissions('category.manage')
  categories(@Param('siteId') siteId: string, @Req() request: FastifyRequest) {
    return this.cms.listCategories(siteId, request.admin!.id);
  }

  @Patch('categories/:id')
  @Permissions('category.manage')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() request: FastifyRequest,
  ) {
    return this.cms.updateCategory(id, dto, request.admin!.id);
  }

  @Delete('categories/:id')
  @Permissions('category.manage')
  deleteCategory(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.deleteCategory(id, request.admin!.id);
  }

  @Post('content/:id/publish')
  @Permissions('content.publish')
  publish(
    @Param('id') id: string,
    @Body() dto: PublishContentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.cms.publish(id, dto, request.admin!.id);
  }
}
