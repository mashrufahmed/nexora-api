import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { PublishProductDto } from './dto/publish-product.dto.js';
import { ProductsService } from './products.service.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { UpdateImageDto } from './dto/update-image.dto.js';
import { UpdateSiteProductDto } from './dto/update-site-product.dto.js';

@Controller()
@UseGuards(AdminAuthGuard, PermissionGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post('brands') @Permissions('product.create')
  createBrand(@Body() dto: CreateBrandDto, @Req() request: FastifyRequest) { return this.products.createBrand(dto, request.admin!.id); }

  @Post('products') @Permissions('product.create')
  createProduct(@Body() dto: CreateProductDto, @Req() request: FastifyRequest) { return this.products.createProduct(dto, request.admin!.id); }

  @Get('products') @Permissions('product.create')
  listProducts() { return this.products.listProducts(); }

  @Get('products/:id') @Permissions('product.create')
  getProduct(@Param('id') id: string) { return this.products.getProduct(id); }

  @Patch('products/:id') @Permissions('product.update')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() request: FastifyRequest) { return this.products.updateProduct(id, dto, request.admin!.id); }

  @Delete('products/:id') @Permissions('product.delete')
  removeProduct(@Param('id') id: string, @Req() request: FastifyRequest) { return this.products.removeProduct(id, request.admin!.id); }

  @Post('products/:id/variants') @Permissions('product.update')
  addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto, @Req() request: FastifyRequest) { return this.products.addVariant(id, dto, request.admin!.id); }

  @Post('products/:id/images/:mediaAssetId') @Permissions('product.update')
  addImage(@Param('id') id: string, @Param('mediaAssetId') mediaAssetId: string, @Body() dto: UpdateImageDto, @Req() request: FastifyRequest) { return this.products.addImage(id, mediaAssetId, dto, request.admin!.id); }

  @Patch('product-images/:id') @Permissions('product.update')
  updateImage(@Param('id') id: string, @Body() dto: UpdateImageDto, @Req() request: FastifyRequest) { return this.products.updateImage(id, dto, request.admin!.id); }

  @Delete('product-images/:id') @Permissions('product.update')
  removeImage(@Param('id') id: string, @Req() request: FastifyRequest) { return this.products.removeImage(id, request.admin!.id); }

  @Patch('site-products/:id') @Permissions('product.update')
  updateSiteProduct(@Param('id') id: string, @Body() dto: UpdateSiteProductDto, @Req() request: FastifyRequest) { return this.products.updateSiteProduct(id, dto, request.admin!.id); }

  @Post('sites/:siteId/products/:productId/publish') @Permissions('product.publish')
  publish(@Param('siteId') siteId: string, @Param('productId') productId: string, @Body() dto: Omit<PublishProductDto, 'siteId'>, @Req() request: FastifyRequest) { return this.products.publishProduct(productId, { ...dto, siteId }, request.admin!.id); }
}