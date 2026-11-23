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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { AffiliateService } from './affiliate.service.js';
import {
  AffiliateLinkDto,
  MerchantDto,
  UpdateMerchantDto,
} from './dto/affiliate.dto.js';
import { AffiliateListQueryDto } from './dto/affiliate-list-query.dto.js';
import { IdParamDto } from '../../common/dto/resource-params.dto.js';
@Controller()
export class AffiliateController {
  constructor(private readonly affiliate: AffiliateService) {}
  @Post('merchants')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('affiliate.manage')
  merchant(@Body() dto: MerchantDto, @Req() req: FastifyRequest) {
    return this.affiliate.merchant(dto, req.admin!.id);
  }
  @Get('merchants')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('affiliate.manage')
  merchants() {
    return this.affiliate.listMerchants();
  }
  @Patch('merchants/:id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('affiliate.manage')
  updateMerchant(
    @Param() params: IdParamDto,
    @Body() dto: UpdateMerchantDto,
    @Req() req: FastifyRequest,
  ) {
    return this.affiliate.updateMerchant(params.id, dto, req.admin!.id);
  }
  @Delete('merchants/:id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('affiliate.manage')
  deleteMerchant(@Param() params: IdParamDto, @Req() req: FastifyRequest) {
    return this.affiliate.deleteMerchant(params.id, req.admin!.id);
  }
  @Post('affiliate-links')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('affiliate.manage')
  create(@Body() dto: AffiliateLinkDto, @Req() req: FastifyRequest) {
    return this.affiliate.createLink(dto, req.admin!.id);
  }
  @Get('affiliate-links')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('affiliate.manage')
  list(@Query() query: AffiliateListQueryDto, @Req() req: FastifyRequest) {
    return this.affiliate.list(query.siteId, req.admin!.id);
  }
  @Patch('affiliate-links/:id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('affiliate.manage')
  update(
    @Param() params: IdParamDto,
    @Body() dto: Partial<AffiliateLinkDto>,
    @Req() req: FastifyRequest,
  ) {
    return this.affiliate.updateLink(params.id, dto, req.admin!.id);
  }
  @Delete('affiliate-links/:id')
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions('affiliate.manage')
  remove(@Param() params: IdParamDto, @Req() req: FastifyRequest) {
    return this.affiliate.deleteLink(params.id, req.admin!.id);
  }
  @Get('go/:id') async go(
    @Param() params: IdParamDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const result = await this.affiliate.redirect(
      params.id,
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined,
    );
    return reply.redirect(result.url, 302);
  }
}
