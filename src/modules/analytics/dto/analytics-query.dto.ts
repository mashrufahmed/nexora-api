import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AnalyticsQueryDto {
  @IsString()
  siteId!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}