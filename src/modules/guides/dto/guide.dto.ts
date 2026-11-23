import {
  IsArray,
  ArrayNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsInt,
  MinLength,
  Min,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
export class GuideDto {
  @IsString() siteId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() body?: Record<string, unknown>;
}
export class GuideItemsDto {
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => GuideItemDto) items!: GuideItemDto[];
}

export class GuideItemDto {
  @IsString() siteProductId!: string;
  @Type(() => Number) @IsInt() @Min(0) position!: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
