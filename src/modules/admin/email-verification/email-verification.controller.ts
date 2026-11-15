import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { seconds, Throttle } from '@nestjs/throttler';
import { ResendEmailOtpDto } from './dto/resend-email-otp.dto.js';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto.js';
import { EmailVerificationService } from './email-verification.service.js';

@Controller('admin/email')
export class EmailVerificationController {
  constructor(private readonly emailVerification: EmailVerificationService) {}

  @Throttle({
    default: {
      limit: 5,
      ttl: seconds(60),
    },
  })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyEmailOtpDto) {
    await this.emailVerification.verifyEmailOtp(dto.email, dto.otp);

    return {
      emailVerified: true,
    };
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: seconds(60),
    },
  })
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  async resend(@Body() dto: ResendEmailOtpDto) {
    await this.emailVerification.resendOtpByEmail(dto.email);
    return {
      message: 'Verification code sent successfully',
    };
  }
}
