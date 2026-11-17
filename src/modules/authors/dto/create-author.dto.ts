import { IsEmail, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAuthorDto {
  @IsOptional() @IsString() siteId?: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsString() @MinLength(2) @MaxLength(160) slug!: string;
  @IsOptional() @IsString() avatarMediaId?: string;
  @IsOptional() @IsString() @MaxLength(5000) bio?: string;
  @IsOptional() @IsString() @MaxLength(500) shortBio?: string;
  @IsOptional() @IsString() @MaxLength(160) designation?: string;
  @IsOptional() @IsString() @MaxLength(500) website?: string;
  @IsOptional() @IsObject() socialLinks?: Record<string, unknown>;
  @IsOptional() @IsEmail() email?: string;
}