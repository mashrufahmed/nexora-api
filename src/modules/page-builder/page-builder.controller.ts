import {
  Body,
  Controller,
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
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';
import { PageBuilderService } from './page-builder.service.js';

@Controller('page-templates')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class PageBuilderController {
  constructor(private readonly pages: PageBuilderService) {}
  @Post() @Permissions('page.edit') create(
    @Body() dto: CreateTemplateDto,
    @Req() req: FastifyRequest,
  ) {
    return this.pages.create(dto, req.admin!.id);
  }
  @Get('site/:siteId') @Permissions('page.edit') list(
    @Param('siteId') siteId: string,
    @Req() req: FastifyRequest,
  ) {
    return this.pages.list(siteId, req.admin!.id);
  }
  @Patch(':id') @Permissions('page.edit') update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: FastifyRequest,
  ) {
    return this.pages.update(id, dto, req.admin!.id);
  }
  @Post(':id/revisions/:revisionId/publish')
  @Permissions('page.publish')
  publish(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: FastifyRequest,
  ) {
    return this.pages.publish(id, revisionId, req.admin!.id);
  }
  @Get(':id/versions') @Permissions('page.edit') versions(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    return this.pages.versions(id, req.admin!.id);
  }
  @Get(':id/revisions/:revisionId/preview') @Permissions('page.edit') preview(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: FastifyRequest,
  ) {
    return this.pages.preview(id, revisionId, req.admin!.id);
  }
  @Post(':id/revisions/:revisionId/restore') @Permissions('page.edit') restore(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: FastifyRequest,
  ) {
    return this.pages.restore(id, revisionId, req.admin!.id);
  }
}
