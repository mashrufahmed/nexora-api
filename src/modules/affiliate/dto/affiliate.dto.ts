import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
export class MerchantDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @MinLength(2) @MaxLength(120) slug!: string;
  @IsOptional() @IsUrl({ require_protocol: true }) website?: string;
}
export class AffiliateLinkDto {
  @IsString() siteId!: string;
  @IsOptional() @IsString() siteProductId?: string;
  @IsOptional() @IsString() tagId?: string;
  @IsString() merchantId!: string;
  @IsUrl({ require_protocol: true }) destinationUrl!: string;
  @IsOptional() @IsUrl({ require_protocol: true }) trackingUrl?: string;
  @IsEnum(['INACTIVE', 'ACTIVE']) status!: 'INACTIVE' | 'ACTIVE';
}

export class UpdateMerchantDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) slug?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) website?: string;
  @IsOptional() @IsEnum(['INACTIVE', 'ACTIVE']) status?: 'INACTIVE' | 'ACTIVE';
}
