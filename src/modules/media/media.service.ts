import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { UpdateMediaDto } from './dto/update-media.dto.js';
import { UploadMediaDto } from './dto/upload-media.dto.js';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  private json(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
  private async access(adminId: string, siteId?: string) {
    if (!siteId) return;
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId }, select: { roles: { select: { role: { select: { name: true } } } } } });
    if (admin?.roles.some(({ role }) => role.name === 'Super Admin')) return;
    const allowed = await this.prisma.userSiteAccess.findUnique({ where: { userId_siteId: { userId: adminId, siteId } }, select: { id: true } });
    if (!allowed) throw new ForbiddenException('You do not have access to this site');
  }
  private signature(buffer: Buffer): string | undefined {
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
    if (buffer.subarray(0, 6).toString() === 'GIF89a' || buffer.subarray(0, 6).toString() === 'GIF87a') return 'image/gif';
    if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    return undefined;
  }
  async upload(dto: UploadMediaDto, adminId: string) {
    await this.access(adminId, dto.siteId);
    const extension = extname(dto.originalFilename).toLowerCase().replace('.', '');
    const allowed: Record<string, string[]> = { png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], gif: ['image/gif'], webp: ['image/webp'] };
    if (!allowed[extension]?.includes(dto.mimeType)) throw new BadRequestException('Extension and MIME type do not match');
    const buffer = Buffer.from(dto.data, 'base64');
    if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new BadRequestException('Media must be between 1 byte and 10 MB');
    if (this.signature(buffer) !== dto.mimeType) throw new BadRequestException('File signature does not match MIME type');
    const storageKey = `${dto.siteId ?? 'global'}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const metadata = { ...dto.metadata, sha256: createHash('sha256').update(buffer).digest('hex') };
    const asset = await this.prisma.mediaAsset.create({ data: { siteId: dto.siteId, originalFilename: dto.originalFilename, storageKey, mimeType: dto.mimeType, extension, size: buffer.length, width: dto.width, height: dto.height, alt: dto.alt?.trim(), caption: dto.caption?.trim(), metadata: this.json(metadata) } });
    await this.audit.log({ actorAdminId: adminId, action: 'media.uploaded', entityType: 'media_asset', entityId: asset.id });
    return asset;
  }
  async list(adminId: string, siteId?: string, search?: string) { await this.access(adminId, siteId); return this.prisma.mediaAsset.findMany({ where: { status: 'ACTIVE', ...(siteId !== undefined && { siteId }), ...(search && { originalFilename: { contains: search, mode: 'insensitive' } }) }, orderBy: { createdAt: 'desc' } }); }
  async update(id: string, dto: UpdateMediaDto, adminId: string) { const asset = await this.prisma.mediaAsset.findUnique({ where: { id }, select: { siteId: true } }); if (!asset) throw new NotFoundException('Media asset not found'); await this.access(adminId, asset.siteId ?? undefined); const updated = await this.prisma.mediaAsset.update({ where: { id }, data: { ...(dto.alt !== undefined && { alt: dto.alt.trim() }), ...(dto.caption !== undefined && { caption: dto.caption.trim() }), ...(dto.metadata !== undefined && { metadata: this.json(dto.metadata) }) } }); await this.audit.log({ actorAdminId: adminId, action: 'media.updated', entityType: 'media_asset', entityId: id }); return updated; }
  async remove(id: string, adminId: string) { const asset = await this.prisma.mediaAsset.findUnique({ where: { id }, select: { siteId: true } }); if (!asset) throw new NotFoundException('Media asset not found'); await this.access(adminId, asset.siteId ?? undefined); const references = await this.prisma.$queryRaw<{ count: bigint }[]>`SELECT (SELECT COUNT(*) FROM product_images WHERE media_asset_id = ${id}) + (SELECT COUNT(*) FROM contents WHERE featured_media_id = ${id}) + (SELECT COUNT(*) FROM sites WHERE logo_media_id = ${id} OR favicon_media_id = ${id}) AS count`; if (Number(references[0]?.count ?? 0) > 0) throw new ConflictException('Media asset is still referenced'); await this.prisma.mediaAsset.update({ where: { id }, data: { status: 'DELETED' } }); await this.audit.log({ actorAdminId: adminId, action: 'media.deleted', entityType: 'media_asset', entityId: id }); return { message: 'Media asset deleted successfully' }; }
}