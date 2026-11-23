import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SiteStatus } from '../../../database/generated/prisma/client.js';

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  seoSettings?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  logoMediaId?: string | null;

  @IsOptional()
  @IsString()
  darkLogoMediaId?: string | null;

  @IsOptional()
  @IsString()
  faviconMediaId?: string | null;
}
