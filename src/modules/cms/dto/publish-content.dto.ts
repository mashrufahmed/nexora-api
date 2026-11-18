import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishContentDto {
  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}
