import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { PublishProductDto } from './dto/publish-product.dto.js';
import { UpdateImageDto } from './dto/update-image.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private jsonValue(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  }

  private async assertSiteAccess(adminId: string, siteId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (admin?.roles.some(({ role }) => role.name === 'Super Admin')) return;
    const access = await this.prisma.userSiteAccess.findUnique({
      where: { userId_siteId: { userId: adminId, siteId } },
      select: { id: true },
    });
    if (!access)
      throw new ForbiddenException('You do not have access to this site');
  }

  async createBrand(dto: CreateBrandDto, adminId: string) {
    try {
      const brand = await this.prisma.brand.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          description: dto.description?.trim(),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'brand.created',
        entityType: 'brand',
        entityId: brand.id,
      });
      return brand;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Brand slug already exists');
      throw error;
    }
  }

  async createProduct(dto: CreateProductDto, adminId: string) {
    if (
      dto.brandId &&
      !(await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Brand not found');
    try {
      const product = await this.prisma.product.create({
        data: {
          brandId: dto.brandId,
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          modelNumber: dto.modelNumber?.trim(),
          description: dto.description?.trim(),
          specifications: this.jsonValue(dto.specifications),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'product.created',
        entityType: 'product',
        entityId: product.id,
      });
      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Product slug already exists');
      throw error;
    }
  }

  async listProducts() {
    return this.prisma.product.findMany({
      include: { brand: true, siteProducts: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        variants: true,
        images: { orderBy: { position: 'asc' } },
        siteProducts: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto, adminId: string) {
    if (
      dto.brandId &&
      !(await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Brand not found');
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.brandId !== undefined && { brandId: dto.brandId }),
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.slug !== undefined && {
            slug: dto.slug.trim().toLowerCase(),
          }),
          ...(dto.modelNumber !== undefined && {
            modelNumber: dto.modelNumber.trim(),
          }),
          ...(dto.description !== undefined && {
            description: dto.description.trim(),
          }),
          ...(dto.specifications !== undefined && {
            specifications: this.jsonValue(dto.specifications),
          }),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'product.updated',
        entityType: 'product',
        entityId: id,
      });
      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException('Product not found');
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Product slug already exists');
      throw error;
    }
  }

  async removeProduct(id: string, adminId: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'product.deleted',
        entityType: 'product',
        entityId: id,
      });
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException('Product not found');
      throw error;
    }
  }

  async addVariant(productId: string, dto: CreateVariantDto, adminId: string) {
    if (
      !(await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Product not found');
    try {
      const variant = await this.prisma.productVariant.create({
        data: {
          productId,
          name: dto.name.trim(),
          sku: dto.sku.trim(),
          attributes: this.jsonValue(dto.attributes),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'product.variant.created',
        entityType: 'product_variant',
        entityId: variant.id,
      });
      return variant;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('SKU already exists');
      throw error;
    }
  }

  async addImage(
    productId: string,
    mediaAssetId: string,
    dto: UpdateImageDto,
    adminId: string,
  ) {
    if (
      !(await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Product not found');
    const image = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary)
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      return tx.productImage.create({
        data: {
          productId,
          mediaAssetId,
          alt: dto.alt?.trim(),
          caption: dto.caption?.trim(),
          position: dto.position ?? 0,
          isPrimary: dto.isPrimary ?? false,
        },
      });
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'product.image.created',
      entityType: 'product_image',
      entityId: image.id,
    });
    return image;
  }

  async updateImage(imageId: string, dto: UpdateImageDto, adminId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true },
    });
    if (!image) throw new NotFoundException('Product image not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary)
        await tx.productImage.updateMany({
          where: { productId: image.productId, id: { not: imageId } },
          data: { isPrimary: false },
        });
      return tx.productImage.update({
        where: { id: imageId },
        data: {
          ...(dto.alt !== undefined && { alt: dto.alt.trim() }),
          ...(dto.caption !== undefined && { caption: dto.caption.trim() }),
          ...(dto.position !== undefined && { position: dto.position }),
          ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        },
      });
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'product.image.updated',
      entityType: 'product_image',
      entityId: imageId,
    });
    return updated;
  }

  async removeImage(imageId: string, adminId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true },
    });
    if (!image) throw new NotFoundException('Product image not found');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'product.image.deleted',
      entityType: 'product_image',
      entityId: imageId,
    });
    return { message: 'Product image deleted successfully' };
  }

  async updateSiteProduct(
    id: string,
    data: {
      title?: string;
      summary?: string;
      slug?: string;
      isFeatured?: boolean;
    },
    adminId: string,
  ) {
    const existing = await this.prisma.siteProduct.findUnique({
      where: { id },
      select: { id: true, siteId: true },
    });
    if (!existing) throw new NotFoundException('Site product not found');
    await this.assertSiteAccess(adminId, existing.siteId);
    try {
      const updated = await this.prisma.siteProduct.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.summary !== undefined && { summary: data.summary.trim() }),
          ...(data.slug !== undefined && {
            slug: data.slug.trim().toLowerCase(),
          }),
          ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'site_product.updated',
        entityType: 'site_product',
        entityId: id,
      });
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Site product slug already exists');
      throw error;
    }
  }

  async publishProduct(
    productId: string,
    dto: PublishProductDto,
    adminId: string,
  ) {
    await this.assertSiteAccess(adminId, dto.siteId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    try {
      const publication = await this.prisma.siteProduct.create({
        data: {
          siteId: dto.siteId,
          productId,
          slug: dto.slug?.trim().toLowerCase() || product.slug,
          title: dto.title?.trim(),
          summary: dto.summary?.trim(),
          status: 'ACTIVE',
          publishedAt: new Date(),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'product.published',
        entityType: 'site_product',
        entityId: publication.id,
      });
      return publication;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Product is already published or slug is already used on this site',
        );
      throw error;
    }
  }
}
