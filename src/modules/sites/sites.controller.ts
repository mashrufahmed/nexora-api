import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { CreateDomainDto } from './dto/create-domain.dto.js';
import { CreateSiteDto } from './dto/create-site.dto.js';
import { UpdateSiteDto } from './dto/update-site.dto.js';
import { SitesService } from './sites.service.js';

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Post()
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.create')
  create(@Body() dto: CreateSiteDto, @Req() request: FastifyRequest) {
    return this.sites.create(dto, request.admin!.id);
  }

  @Get()
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.manage')
  findAll(@Req() request: FastifyRequest) {
    return this.sites.findAll(request.admin!.id);
  }

  @Post(':id/domains')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.manage')
  addDomain(
    @Param('id') id: string,
    @Body() dto: CreateDomainDto,
    @Req() request: FastifyRequest,
  ) {
    return this.sites.addDomain(id, dto, request.admin!.id);
  }

  @Post(':id/secrets')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.manage')
  createSecret(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.sites.createSecret(id, request.admin!.id);
  }

  @Delete(':id/domains/:domainId')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.manage')
  removeDomain(
    @Param('id') id: string,
    @Param('domainId') domainId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.sites.removeDomain(id, domainId, request.admin!.id);
  }

  @Patch(':id/domains/:domainId/primary')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.manage')
  primaryDomain(
    @Param('id') id: string,
    @Param('domainId') domainId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.sites.setPrimaryDomain(id, domainId, request.admin!.id);
  }

  @Delete(':id/secrets/:secretId')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.manage')
  revokeSecret(
    @Param('id') id: string,
    @Param('secretId') secretId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.sites.revokeSecret(id, secretId, request.admin!.id);
  }

  @Get('resolve/hostname')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.manage')
  resolveHostname(@Headers('host') host: string) {
    return this.sites.resolveHostname(host.split(':')[0]);
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.manage')
  findOne(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.sites.findOne(id, request.admin!.id);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @Req() request: FastifyRequest,
  ) {
    return this.sites.update(id, dto, request.admin!.id);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('site.delete')
  remove(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.sites.remove(id, request.admin!.id);
  }
}
