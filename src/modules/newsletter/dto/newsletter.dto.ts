import { IsEmail, IsOptional, IsString } from 'class-validator';
export class SubscribeDto {
  @IsString() siteId!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() source?: string;
}
export class VerifySubscriberDto {
  @IsString() token!: string;
}
