import { BullModule, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, Module } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { IMAGE_VARIANTS } from '../modules/media/media.constants.js';
import { QueueAlertService } from './queue-alert.service.js';

@Processor('affiliate-clicks')
@Injectable()
export class AffiliateClickProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService, private readonly alerts: QueueAlertService) { super(); }
  async process(job: Job<{ affiliateLinkId?: string; siteId?: string; referrer?: string; userAgentHash?: string; dedupeKey?: string; clicks?: Array<{ affiliateLinkId: string; siteId: string; referrer?: string; userAgentHash?: string; dedupeKey?: string }> }>) {
    const data = job.data.clicks ?? (job.data.affiliateLinkId && job.data.siteId ? [{ affiliateLinkId: job.data.affiliateLinkId, siteId: job.data.siteId, referrer: job.data.referrer, userAgentHash: job.data.userAgentHash, dedupeKey: job.data.dedupeKey }] : []);
    if (!data.length) return { count: 0 };
    const unique = [...new Map(data.map((item) => {
      const dedupeKey = item.dedupeKey ?? createHash('sha256').update(`${item.affiliateLinkId}:${item.siteId}:${item.referrer ?? ''}:${item.userAgentHash ?? ''}:${job.id ?? ''}`).digest('hex');
      return [dedupeKey, { ...item, dedupeKey }];
    })).values()];
    return this.prisma.affiliateClick.createMany({ data: unique, skipDuplicates: true });
  }
  @OnWorkerEvent('failed') failed(job: Job | undefined, error: Error) { this.alerts.failed('affiliate-clicks', job, error); }
}

export type MediaThumbnailJob = { mediaAssetId: string; storageKey: string; mimeType: string };

@Processor('media-thumbnails')
@Injectable()
export class MediaThumbnailProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly alerts: QueueAlertService,
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
    const thumbnail = current.thumbnail;
    if (thumbnail && typeof thumbnail === 'object' && !Array.isArray(thumbnail) && (thumbnail as { status?: string }).status === 'READY') return { skipped: true, reason: 'already-ready' };
    try {
      const source = await this.storage.get(job.data.storageKey);
      const variants: Record<string, string> = {};
      for (const { name, width } of IMAGE_VARIANTS) {
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
  @OnWorkerEvent('failed') failed(job: Job | undefined, error: Error) { this.alerts.failed('media-thumbnails', job, error); }
}

export type MediaStorageDeleteJob = { mediaAssetId: string };

@Processor('media-storage-delete')
@Injectable()
export class MediaStorageDeleteProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaStorageDeleteProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly alerts: QueueAlertService,
  ) { super(); }

  async process(job: Job<MediaStorageDeleteJob>) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: job.data.mediaAssetId },
      select: { id: true, status: true, storageKey: true, metadata: true },
    });
    if (!asset) return { skipped: true, reason: 'missing' };

    const metadata = asset.metadata && typeof asset.metadata === 'object' && !Array.isArray(asset.metadata)
      ? asset.metadata as Record<string, unknown>
      : {};
    const thumbnail = metadata.thumbnail && typeof metadata.thumbnail === 'object' && !Array.isArray(metadata.thumbnail)
      ? metadata.thumbnail as Record<string, unknown>
      : {};
    const variants = thumbnail.variants && typeof thumbnail.variants === 'object' && !Array.isArray(thumbnail.variants)
      ? Object.values(thumbnail.variants as Record<string, unknown>).filter((key): key is string => typeof key === 'string')
      : [];
    try {
      await this.storage.delete(asset.storageKey);
      for (const key of variants) await this.storage.delete(key);
      return { mediaAssetId: asset.id, deleted: 1 + variants.length };
    } catch (error) {
      this.logger.error(`MEDIA_STORAGE_DELETE_FAILED asset=${asset.id} job=${job.id ?? 'unknown'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
  @OnWorkerEvent('failed') failed(job: Job | undefined, error: Error) { this.alerts.failed('media-storage-delete', job, error); }
}

@Module({ imports: [BullModule.registerQueue({ name: 'affiliate-clicks' }, { name: 'scheduled-publishing' }, { name: 'media-thumbnails' }, { name: 'media-storage-delete' }, { name: 'email-sending' })], providers: [QueueAlertService, AffiliateClickProcessor, MediaThumbnailProcessor, MediaStorageDeleteProcessor], exports: [BullModule, QueueAlertService] })
export class QueueModule {}