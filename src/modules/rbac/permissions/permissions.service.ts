import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../../database/generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma.service.js';

import { CreatePermissionDto } from '../dto/create-permission.dto.js';
import { UpdatePermissionDto } from '../dto/update-permission.dto.js';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    const name = dto.name.trim();
    const code = dto.code.trim();
    const module = dto.module.trim();

    if (!name || !code || !module) {
      throw new BadRequestException('Name, code and module are required');
    }

    try {
      return await this.prisma.permission.create({
        data: {
          name,
          code,
          module,
          description: dto.description?.trim() || null,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Permission code already exists');
      }

      throw error;
    }
  }

  async findAll(page = 1, limit = 10, search?: string, module?: string) {
    page = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;

    limit = Number.isFinite(limit)
      ? Math.min(Math.max(1, Math.floor(limit)), 100)
      : 10;

    const where: Prisma.PermissionWhereInput = {
      ...(search?.trim() && {
        OR: [
          {
            name: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
          {
            code: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
        ],
      }),
      ...(module?.trim() && {
        module: {
          equals: module.trim(),
          mode: 'insensitive',
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              roles: true,
            },
          },
        },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isSystem: true,
              },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return this.prisma.permission.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name.trim(),
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.module !== undefined && {
          module: dto.module.trim(),
        }),
      },
    });
  }

  async remove(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.prisma.permission.delete({
      where: { id },
    });

    return {
      message: 'Permission deleted successfully',
    };
  }
}
