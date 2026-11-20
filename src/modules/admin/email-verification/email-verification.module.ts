import { Module } from '@nestjs/common';

import { EmailVerificationController } from './email-verification.controller.js';
import { EmailVerificationService } from './email-verification.service.js';
import { VerificationModule } from '../../verification/verification.module.js';

@Module({
  imports: [VerificationModule],
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
