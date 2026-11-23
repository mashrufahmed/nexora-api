import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

@Injectable()
export class QueueAlertService {
  private readonly logger = new Logger(QueueAlertService.name);

  failed(queue: string, job: Job | undefined, error: Error | undefined): void {
    this.logger.error(
      `QUEUE_JOB_FAILED queue=${queue} job=${job?.id ?? 'unknown'} name=${job?.name ?? 'unknown'} attempts=${job?.attemptsMade ?? 0}`,
      error?.stack,
    );
  }
}