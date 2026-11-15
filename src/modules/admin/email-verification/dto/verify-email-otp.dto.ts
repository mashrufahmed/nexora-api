import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits',
  })
  otp!: string;
}
