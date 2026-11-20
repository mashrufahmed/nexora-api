import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { CmsService } from './cms.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { CreateContentDto } from './dto/create-content.dto.js';
import { PublishContentDto } from './dto/publish-content.dto.js';
import { UpdateContentDto } from './dto/update-content.dto.js';

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
  @Permissions('content.create')
  list(@Req() request: FastifyRequest) {
    return this.cms.listContent(request.admin!.id);
  }

  @Get('content/:id')
  @Permissions('content.create')
  get(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.getContent(id, request.admin!.id);
  }

  @Patch('content/:id')
  @Permissions('content.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.cms.updateContent(id, dto, request.admin!.id);
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

  @Post('content/:id/archive')
  @Permissions('content.archive')
  archive(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.cms.transition(id, 'ARCHIVED', request.admin!.id);
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
