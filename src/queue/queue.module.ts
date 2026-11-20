import { BullModule, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Module } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import sharp from 'sharp';

@Processor('affiliate-clicks')
@Injectable()
export class AffiliateClickProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) { super(); }
  async process(job: Job<{ affiliateLinkId?: string; siteId?: string; referrer?: string; userAgentHash?: string; clicks?: Array<{ affiliateLinkId: string; siteId: string; referrer?: string; userAgentHash?: string }> }>) {
    const data = job.data.clicks ?? (job.data.affiliateLinkId && job.data.siteId ? [{ affiliateLinkId: job.data.affiliateLinkId, siteId: job.data.siteId, referrer: job.data.referrer, userAgentHash: job.data.userAgentHash }] : []);
    if (!data.length) return { count: 0 };
    return this.prisma.affiliateClick.createMany({ data });
  }
}

export type MediaThumbnailJob = { mediaAssetId: string; storageKey: string; mimeType: string };

@Processor('media-thumbnails')
@Injectable()
export class MediaThumbnailProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) { super(); }

  async process(job: Job<MediaThumbnailJob>) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: job.data.mediaAssetId },
      select: { id: true, metadata: true, status: true },
    });
    if (!asset || asset.status === 'DELETED') return { skipped: true };

    const current = asset.metadata && typeof asset.metadata === 'object' && !Array.isArray(asset.metadata)
      ? asset.metadata as Record<string, unknown>
      : {};
    try {
      const source = await this.storage.get(job.data.storageKey);
      const variants: Record<string, string> = {};
      for (const [name, width] of [['sm', 320], ['md', 768], ['lg', 1440]] as const) {
        const key = `thumbnails/${asset.id}/${name}.webp`;
        const output = await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        await this.storage.put(key, output, 'image/webp', { source: job.data.storageKey, asset: asset.id, variant: name });
        variants[name] = key;
      }
      await this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { metadata: { ...current, thumbnail: { status: 'READY', variants, generatedAt: new Date().toISOString() } } },
      });
      return { mediaAssetId: asset.id, variants };
    } catch (error) {
      await this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { metadata: { ...current, thumbnail: { status: 'FAILED', error: error instanceof Error ? error.message : 'Thumbnail generation failed', failedAt: new Date().toISOString() } } },
      }).catch(() => undefined);
      throw error;
    }
  }
}

@Module({ imports: [BullModule.registerQueue({ name: 'affiliate-clicks' }, { name: 'scheduled-publishing' }, { name: 'media-thumbnails' }, { name: 'email-sending' })], providers: [AffiliateClickProcessor, MediaThumbnailProcessor], exports: [BullModule] })
export class QueueModule {}