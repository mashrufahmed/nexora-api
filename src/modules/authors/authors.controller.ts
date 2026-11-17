import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { AssignAuthorsDto } from './dto/assign-author.dto.js';
import { CreateAuthorDto } from './dto/create-author.dto.js';
import { UpdateAuthorDto } from './dto/update-author.dto.js';
import { AuthorsService } from './authors.service.js';

@Controller('authors') @UseGuards(AdminAuthGuard, PermissionGuard)
export class AuthorsController { constructor(private readonly authors: AuthorsService) {}
  @Post() @Permissions('author.manage') create(@Body() dto: CreateAuthorDto, @Req() req: FastifyRequest) { return this.authors.create(dto, req.admin!.id); }
  @Get() @Permissions('author.manage') list(@Query('siteId') siteId: string | undefined, @Req() req: FastifyRequest) { return this.authors.list(req.admin!.id, siteId); }
  @Patch(':id') @Permissions('author.manage') update(@Param('id') id: string, @Body() dto: UpdateAuthorDto, @Req() req: FastifyRequest) { return this.authors.update(id, dto, req.admin!.id); }
  @Delete(':id') @Permissions('author.manage') remove(@Param('id') id: string, @Req() req: FastifyRequest) { return this.authors.remove(id, req.admin!.id); }
  @Post('/content/:contentId') @Permissions('author.manage') assign(@Param('contentId') id: string, @Body() dto: AssignAuthorsDto, @Req() req: FastifyRequest) { return this.authors.assign(id, dto, req.admin!.id); }
}