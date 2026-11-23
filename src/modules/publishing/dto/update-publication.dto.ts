import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePublicationDto {
  @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(200) titleOverride?: string;
  @IsOptional() @IsString() @MaxLength(500) descriptionOverride?: string;
  @IsOptional() @IsObject() seo?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) categoryIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tagIds?: string[];
}
