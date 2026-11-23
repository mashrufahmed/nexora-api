import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
export class AnalyticsEventDto {
  @IsString() @MaxLength(100) siteId!: string;
  @IsEnum(['PAGE_VIEW', 'AFFILIATE_CLICK']) type!:
    'PAGE_VIEW' | 'AFFILIATE_CLICK';
  @IsOptional() @IsString() @MaxLength(2000) path?: string;
  @IsOptional() @IsString() @MaxLength(100) entityType?: string;
  @IsOptional() @IsString() @MaxLength(100) entityId?: string;
  @IsOptional() @IsString() @MaxLength(2000) referrer?: string;
  @IsOptional() @IsString() @MaxLength(500) userAgent?: string;
}
