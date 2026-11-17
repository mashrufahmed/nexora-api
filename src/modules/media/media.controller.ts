import { Body, Controller, Delete, Get, Patch, Post, Query, Param, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { UpdateMediaDto } from './dto/update-media.dto.js';
import { UploadMediaDto } from './dto/upload-media.dto.js';
import { MediaService } from './media.service.js';

@Controller('media') @UseGuards(AdminAuthGuard, PermissionGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post() @Permissions('media.upload') upload(@Body() dto: UploadMediaDto, @Req() req: FastifyRequest) { return this.media.upload(dto, req.admin!.id); }
  @Get() @Permissions('media.upload') list(@Query('siteId') siteId: string | undefined, @Query('search') search: string | undefined, @Req() req: FastifyRequest) { return this.media.list(req.admin!.id, siteId, search); }
  @Patch(':id') @Permissions('media.upload') update(@Param('id') id: string, @Body() dto: UpdateMediaDto, @Req() req: FastifyRequest) { return this.media.update(id, dto, req.admin!.id); }
  @Delete(':id') @Permissions('media.delete') remove(@Param('id') id: string, @Req() req: FastifyRequest) { return this.media.remove(id, req.admin!.id); }
}