import { IsEmail, MaxLength } from 'class-validator';

export class ResendEmailOtpDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
