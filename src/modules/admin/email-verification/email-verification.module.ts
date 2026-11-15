import { Module } from '@nestjs/common';

import { EmailVerificationController } from './email-verification.controller.js';
import { EmailVerificationService } from './email-verification.service.js';

@Module({
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
